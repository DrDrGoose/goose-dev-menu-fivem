const fs = require("fs");
const path = require("path");

const RES = GetCurrentResourceName();
const RES_PATH = GetResourcePath(RES);
const STORE_FILE = path.join(RES_PATH, "lastpos.json");

function safeJsonParse(raw, fallback) {
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj;
  } catch {}
  return fallback;
}

let store = { enabled: {}, pos: {} };

function loadStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
      return;
    }
    store = safeJsonParse(fs.readFileSync(STORE_FILE, "utf8"), store);
    if (!store.enabled) store.enabled = {};
    if (!store.pos) store.pos = {};
  } catch (e) {
    console.log(`[goose_devmenu] lastpos.json load error: ${e}`);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.log(`[goose_devmenu] lastpos.json save error: ${e}`);
  }
}

function getKey(src) {
  try {
    if (typeof GetPlayerIdentifierByType === "function") {
      const lic = GetPlayerIdentifierByType(src, "license");
      if (lic) return `license:${lic}`;
      const fivem = GetPlayerIdentifierByType(src, "fivem");
      if (fivem) return `fivem:${fivem}`;
      const discord = GetPlayerIdentifierByType(src, "discord");
      if (discord) return `discord:${discord}`;
    }
  } catch {}

  try {
    if (typeof GetPlayerIdentifiers === "function") {
      const ids = GetPlayerIdentifiers(src) || [];
      return ids.find((x) => x.startsWith("license:")) || ids[0] || `src:${src}`;
    }
  } catch {}

  return `src:${src}`;
}


function hasPerm(src) {
  return IsPlayerAceAllowed(src, "goose.dev");
}

function readConfig() {
  try {
    const raw = LoadResourceFile(RES, "config.json");
    return safeJsonParse(raw || "{}", {});
  } catch {
    return {};
  }
}

function getDefaultSpawn() {
  const cfg = readConfig();
  const s = cfg.spawn || {};
  const x = Number(s.x), y = Number(s.y), z = Number(s.z), h = Number(s.h);
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
    return { x, y, z, h: Number.isFinite(h) ? h : 0.0, model: String(s.model || "mp_m_freemode_01") };
  }
  return { x: 0.0, y: 0.0, z: 72.0, h: 0.0, model: "mp_m_freemode_01" };
}

function getWorldDefaults() {
  const cfg = readConfig();
  const w = cfg.world || {};
  return {
    trafficEnabledDefault: w.trafficEnabledDefault !== false,
    policeEnabledDefault: w.policeEnabledDefault === true
  };
}

function savePlayerPosFromClient(src, pos) {
  const key = getKey(src);
  if (!store.enabled[key]) return;

  const x = Number(pos?.x), y = Number(pos?.y), z = Number(pos?.z), h = Number(pos?.h ?? 0.0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

  store.pos[key] = { x, y, z, h: Number.isFinite(h) ? h : 0.0, t: Date.now() };
  saveStore();
}



loadStore();

// --- Auth ---
onNet("goose:auth:request", () => {
  const src = global.source;
  emitNet("goose:auth:response", src, hasPerm(src));
});

// --- Init (Spawn + Defaults + LastPos state) ---
onNet("goose:init:request", () => {
  const src = global.source;
  const key = getKey(src);

  const lastposEnabled = !!store.enabled[key];
  const saved = lastposEnabled ? store.pos[key] : null;

  const spawn = saved || getDefaultSpawn();
  const world = getWorldDefaults();

  emitNet("goose:init:response", src, {
    lastposEnabled,
    spawnPos: spawn,
    world
  });
});

// --- LastPos toggles ---
onNet("goose:lastpos:setEnabled", (enabled) => {
  const src = global.source;
  if (!hasPerm(src)) return;

  const key = getKey(src);
  store.enabled[key] = !!enabled;
  saveStore();

  emitNet("goose:lastpos:state", src, !!store.enabled[key]);
});

onNet("goose:lastpos:saveNow", (pos) => {
  const src = global.source;
  if (!hasPerm(src)) return;
  savePlayerPosFromClient(src, pos);
});

on("playerDropped", () => {
  const src = global.source;
});
