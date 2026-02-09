const Delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForSessionReady(timeoutMs = 15000) {
  const start = GetGameTimer();

  // warten bis Network session da ist
  while (!NetworkIsSessionStarted()) {
    await Delay(0);
    if (GetGameTimer() - start > timeoutMs) return false;
  }

  // warten bis Player wirklich "playing" ist
  while (!IsPlayerPlaying(PlayerId())) {
    await Delay(0);
    if (GetGameTimer() - start > timeoutMs) return false;
  }

  // warten bis Ped existiert
  while (!DoesEntityExist(PlayerPedId())) {
    await Delay(0);
    if (GetGameTimer() - start > timeoutMs) return false;
  }

  return true;
}

function shutdownLoadingScreensOnce() {
  // diese Calls sind safe, auch wenn sie mehrfach kommen
  try { ShutdownLoadingScreenNui(); } catch {}
  try { ShutdownLoadingScreen(); } catch {}
}


function readConfig() {
  try {
    const raw = LoadResourceFile(GetCurrentResourceName(), "config.json");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const CONFIG = readConfig();
const DEFAULT_SPAWN = {
  x: Number(CONFIG?.spawn?.x ?? 0.0),
  y: Number(CONFIG?.spawn?.y ?? 0.0),
  z: Number(CONFIG?.spawn?.z ?? 72.0),
  h: Number(CONFIG?.spawn?.h ?? 0.0),
};
const DEFAULT_MODEL = String(CONFIG?.spawn?.model ?? "mp_m_freemode_01");

let devAllowed = false;
let menuOpen = false;

let trafficEnabled = CONFIG?.world?.trafficEnabledDefault !== false;
let policeEnabled = CONFIG?.world?.policeEnabledDefault === true;

let gotInit = false;
let didSpawn = false;

let godModeEnabled = true;
let lastposEnabled = false;


function toast(message, ok = true) {
  SendNUIMessage({ type: "toast", message: String(message), ok: !!ok });
}

function setMenu(open) {
  menuOpen = !!open;

  SendNUIMessage({ type: "menu", open: menuOpen });

  if (menuOpen) {
    SetNuiFocus(true, true);

    SetNuiFocusKeepInput(false);
  } else {
    SetNuiFocus(false, false);
    SetNuiFocusKeepInput(false);
  }
}


// Controls sperren, solange Menü offen ist
setTick(() => {
  if (!menuOpen) return;

  DisableAllControlActions(0);

  EnableControlAction(0, 200, true); // ESC
  EnableControlAction(0, 115, true); // F4 (Control)

  if (IsControlJustPressed(0, 115)) {
    setMenu(false);
  }
});



// KI Verkehr aus => Dichte auf 0
setTick(() => {
  if (trafficEnabled) return;

  SetVehicleDensityMultiplierThisFrame(0.0);
  SetRandomVehicleDensityMultiplierThisFrame(0.0);
  SetParkedVehicleDensityMultiplierThisFrame(0.0);

  SetPedDensityMultiplierThisFrame(0.0);
  SetScenarioPedDensityMultiplierThisFrame(0.0, 0.0);
});

// Polizei aus => Wanted/Dispatch weg
setTick(() => {
  if (policeEnabled) return;

  const pid = PlayerId();
  const ped = PlayerPedId();

  SetMaxWantedLevel(0);
  ClearPlayerWantedLevel(pid);
  SetPlayerWantedLevel(pid, 0, false);
  SetPlayerWantedLevelNow(pid, false);

  SetPoliceIgnorePlayer(ped, true);
  SetEveryoneIgnorePlayer(pid, true);

  SetCreateRandomCops(false);
  SetCreateRandomCopsNotOnScenarios(false);
  SetCreateRandomCopsOnScenarios(false);

  for (let i = 1; i <= 15; i++) EnableDispatchService(i, false);
  SetDispatchCopsForPlayer(pid, false);
});

setTick(() => {
  if (!godModeEnabled) return;

  const ped = PlayerPedId();
  if (!ped || ped === 0) return;

  // Unsterblich + keine Critical Hits
  SetEntityInvincible(ped, true);
  SetPedCanRagdoll(ped, false);
  SetPedCanRagdollFromPlayerImpact(ped, false);
  SetPedSuffersCriticalHits(ped, false);

  // Optional: Health/Armour oben halten (falls irgendwas doch was abzieht)
  if (GetEntityHealth(ped) < 200) SetEntityHealth(ped, 200);
  if (GetPedArmour(ped) < 100) SetPedArmour(ped, 100);
});


async function requestModel(hash) {
  RequestModel(hash);
  const start = GetGameTimer();
  while (!HasModelLoaded(hash)) {
    await Delay(0);
    if (GetGameTimer() - start > 8000) return false;
  }
  return true;
}

async function setModel(modelName) {
  const ready = await waitForSessionReady();
  if (!ready) return false;
  const hash = GetHashKey(modelName);
  const ok = await requestModel(hash);
  if (!ok) return false;

  SetPlayerModel(PlayerId(), hash);
  SetModelAsNoLongerNeeded(hash);

  const ped = PlayerPedId();
  SetPedDefaultComponentVariation(ped);
  ClearAllPedProps(ped);
  return true;
}

async function forceSpawnAt(pos, modelName) {
  const ready = await waitForSessionReady();
  if (!ready) return;
  shutdownLoadingScreensOnce();
  const p = pos || DEFAULT_SPAWN;
  const model = modelName || DEFAULT_MODEL;

  // Screen fade out
  DoScreenFadeOut(0);
  while (!IsScreenFadedOut()) await Delay(0);

  // Player control OFF während wir umsetzen
  SetPlayerControl(PlayerId(), false, 0);

  // Model setzen (falls du das machst)
  await setModel(model);

  const ped = PlayerPedId();

  // Freeze + collision off beim Umsetzen
  FreezeEntityPosition(ped, true);
  SetEntityCollision(ped, false, false);

  // Collision anfordern & Szene laden
  RequestCollisionAtCoord(p.x, p.y, p.z);
  NewLoadSceneStart(p.x, p.y, p.z, 0.0, 0.0, 0.0, 50.0, 0);

  // Teleport + resurrect
  SetEntityCoordsNoOffset(ped, p.x, p.y, p.z, false, false, false);
  SetEntityHeading(ped, p.h ?? 0.0);
  NetworkResurrectLocalPlayer(p.x, p.y, p.z, p.h ?? 0.0, true, true, false);

  // Warten bis collision geladen ist
  const start = GetGameTimer();
  while (!HasCollisionLoadedAroundEntity(ped)) {
    await Delay(0);
    if (GetGameTimer() - start > 5000) break;
  }

  // Szene stoppen
  NewLoadSceneStop();

  // Ped sauber „un-freezen“
  ClearPedTasksImmediately(ped);
  FreezeEntityPosition(ped, false);
  SetEntityCollision(ped, true, true);

  // Bewegung/Physik wieder aktivieren
  SetEntityDynamic(ped, true);
  ActivatePhysics(ped);

  // Kontrolle zurückgeben
  SetPlayerControl(PlayerId(), true, 0);

  // Health (optional)
  SetEntityHealth(ped, 200);
  SetPedArmour(ped, 100);

  // Fade in
  DoScreenFadeIn(500);
  shutdownLoadingScreensOnce();
  didSpawn = true;
}


const WEAPONS = [
  "WEAPON_DAGGER","WEAPON_BAT","WEAPON_BOTTLE","WEAPON_CROWBAR","WEAPON_FLASHLIGHT","WEAPON_GOLFCLUB",
  "WEAPON_HAMMER","WEAPON_HATCHET","WEAPON_KNUCKLE","WEAPON_KNIFE","WEAPON_MACHETE","WEAPON_SWITCHBLADE",
  "WEAPON_NIGHTSTICK","WEAPON_WRENCH","WEAPON_BATTLEAXE","WEAPON_POOLCUE","WEAPON_STONE_HATCHET",
  "WEAPON_PISTOL","WEAPON_PISTOL_MK2","WEAPON_COMBATPISTOL","WEAPON_APPISTOL","WEAPON_STUNGUN","WEAPON_PISTOL50",
  "WEAPON_SNSPISTOL","WEAPON_SNSPISTOL_MK2","WEAPON_HEAVYPISTOL","WEAPON_VINTAGEPISTOL","WEAPON_FLAREGUN",
  "WEAPON_MARKSMANPISTOL","WEAPON_REVOLVER","WEAPON_REVOLVER_MK2","WEAPON_DOUBLEACTION","WEAPON_RAYPISTOL",
  "WEAPON_CERAMICPISTOL","WEAPON_NAVYREVOLVER","WEAPON_GADGETPISTOL",
  "WEAPON_MICROSMG","WEAPON_SMG","WEAPON_SMG_MK2","WEAPON_ASSAULTSMG","WEAPON_COMBATPDW","WEAPON_MACHINEPISTOL",
  "WEAPON_MINISMG","WEAPON_RAYCARBINE",
  "WEAPON_PUMPSHOTGUN","WEAPON_PUMPSHOTGUN_MK2","WEAPON_SAWNOFFSHOTGUN","WEAPON_ASSAULTSHOTGUN",
  "WEAPON_BULLPUPSHOTGUN","WEAPON_MUSKET","WEAPON_HEAVYSHOTGUN","WEAPON_DBSHOTGUN","WEAPON_AUTOSHOTGUN",
  "WEAPON_COMBATSHOTGUN",
  "WEAPON_ASSAULTRIFLE","WEAPON_ASSAULTRIFLE_MK2","WEAPON_CARBINERIFLE","WEAPON_CARBINERIFLE_MK2","WEAPON_ADVANCEDRIFLE",
  "WEAPON_SPECIALCARBINE","WEAPON_SPECIALCARBINE_MK2","WEAPON_BULLPUPRIFLE","WEAPON_BULLPUPRIFLE_MK2",
  "WEAPON_COMPACTRIFLE","WEAPON_MILITARYRIFLE","WEAPON_HEAVYRIFLE","WEAPON_TACTICALRIFLE",
  "WEAPON_MG","WEAPON_COMBATMG","WEAPON_COMBATMG_MK2","WEAPON_GUSENBERG",
  "WEAPON_SNIPERRIFLE","WEAPON_HEAVYSNIPER","WEAPON_HEAVYSNIPER_MK2","WEAPON_MARKSMANRIFLE","WEAPON_MARKSMANRIFLE_MK2",
  "WEAPON_PRECISIONRIFLE",
  "WEAPON_RPG","WEAPON_GRENADELAUNCHER","WEAPON_GRENADELAUNCHER_SMOKE","WEAPON_MINIGUN","WEAPON_FIREWORK",
  "WEAPON_RAILGUN","WEAPON_HOMINGLAUNCHER","WEAPON_COMPACTLAUNCHER","WEAPON_RAYMINIGUN","WEAPON_EMPLAUNCHER",
  "WEAPON_GRENADE","WEAPON_BZGAS","WEAPON_MOLOTOV","WEAPON_STICKYBOMB","WEAPON_PROXMINE","WEAPON_SNOWBALL",
  "WEAPON_PIPEBOMB","WEAPON_BALL","WEAPON_SMOKEGRENADE","WEAPON_FLARE",
  "WEAPON_FIREEXTINGUISHER","WEAPON_PETROLCAN","WEAPON_HAZARDCAN","WEAPON_FERTILIZERCAN",
  "GADGET_PARACHUTE"
];

// --- Commands / Keybinds ---
RegisterCommand("goosemenu", () => {
  if (!devAllowed) return toast("Keine Berechtigung (goose.dev)", false);
  setMenu(!menuOpen);
}, false);
RegisterKeyMapping("goosemenu", "Goose Dev Menü öffnen/schließen", "keyboard", "F4");

RegisterCommand("goosenoclip", () => {
  if (!devAllowed) return toast("Keine Berechtigung (goose.dev)", false);
  globalThis.__gooseNoclipToggle?.();
  SendNUIMessage({ type: "noclip", enabled: !!globalThis.__gooseNoclipEnabled?.() });
}, false);
RegisterKeyMapping("goosenoclip", "NoClip an/aus", "keyboard", "F3");
RegisterKeyMapping("gooseweapons", "Goose: Alle Waffen", "keyboard", "F9");
RegisterKeyMapping("gooserepair", "Goose: Fahrzeug reparieren", "keyboard", "F10");


// --- NUI callbacks (OHNE Doppelpunkte) ---
function regNui(name, handler) {
  RegisterNuiCallbackType(name);
  on(`__cfx_nui:${name}`, handler);
}

RegisterCommand("gooseweapons", () => {
  if (!devAllowed) return toast("Keine Berechtigung (goose.dev)", false);

  const ped = PlayerPedId();
  for (const w of WEAPONS) GiveWeaponToPed(ped, GetHashKey(w), 500, false, true);
  toast("Alle Waffen erhalten");
}, false);

RegisterCommand("gooserepair", () => {
  if (!devAllowed) return toast("Keine Berechtigung (goose.dev)", false);

  const ped = PlayerPedId();
  if (!IsPedInAnyVehicle(ped, false)) return toast("Du sitzt in keinem Fahrzeug", false);

  const veh = GetVehiclePedIsIn(ped, false);
  SetVehicleFixed(veh);
  SetVehicleDeformationFixed(veh);
  SetVehicleUndriveable(veh, false);

  toast("Fahrzeug repariert");
}, false);


regNui("closeMenu", (data, cb) => { setMenu(false); cb({ ok: true }); });

regNui("spawnVehicle", async (data, cb) => {
  if (!devAllowed) return cb({ ok: false });

  const name = String(data?.name ?? "").trim();
  if (!name) return cb({ ok: false });

  const hash = GetHashKey(name);
  const ok = await requestModel(hash);
  if (!ok) { toast("Model konnte nicht geladen werden", false); return cb({ ok: false }); }

  const ped = PlayerPedId();
  const c = GetEntityCoords(ped);
  const h = GetEntityHeading(ped);

  const veh = CreateVehicle(hash, c[0] + 2.0, c[1], c[2], h, true, false);
  SetPedIntoVehicle(ped, veh, -1);
  SetModelAsNoLongerNeeded(hash);

  toast(`Fahrzeug gespawnt: ${name}`);
  cb({ ok: true });
});

regNui("repairVehicle", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });

  const ped = PlayerPedId();
  if (!IsPedInAnyVehicle(ped, false)) return cb({ ok: false });
  const veh = GetVehiclePedIsIn(ped, false);

  SetVehicleFixed(veh);
  SetVehicleDeformationFixed(veh);
  SetVehicleUndriveable(veh, false);

  toast("Fahrzeug repariert");
  cb({ ok: true });
});

regNui("toggleDoor", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });

  const door = Number(data?.doorIndex ?? 0);
  const ped = PlayerPedId();
  if (!IsPedInAnyVehicle(ped, false)) return cb({ ok: false });
  const veh = GetVehiclePedIsIn(ped, false);

  const ratio = GetVehicleDoorAngleRatio(veh, door);
  if (ratio > 0.1) SetVehicleDoorShut(veh, door, false);
  else SetVehicleDoorOpen(veh, door, false, false);

  cb({ ok: true });
});

regNui("toggleSeat", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });

  const seat = Number(data?.seatIndex ?? -1);
  const ped = PlayerPedId();
  if (!IsPedInAnyVehicle(ped, false)) return cb({ ok: false });
  const veh = GetVehiclePedIsIn(ped, false);

  TaskWarpPedIntoVehicle(ped, veh, seat);
  cb({ ok: true });
});

regNui("giveAllWeapons", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const ped = PlayerPedId();
  for (const w of WEAPONS) GiveWeaponToPed(ped, GetHashKey(w), 500, false, true);
  toast("Alle Waffen erhalten");
  cb({ ok: true });
});

regNui("requestPlayerCoords", (data, cb) => {
  const ped = PlayerPedId();
  const c = GetEntityCoords(ped);
  const h = GetEntityHeading(ped);
  console.log(`[goose_devmenu] Coords: ${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} | Heading: ${h.toFixed(1)}`);
  toast("Position in F8-Konsole");
  cb({ ok: true });
});

regNui("clientTime_change", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const hour = Math.max(0, Math.min(23, Number(data?.hour ?? 12)));
  NetworkOverrideClockTime(hour, 0, 0);
  cb({ ok: true });
});

regNui("clientWeather_change", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const weather = String(data?.weather ?? "CLEAR").toUpperCase();
  ClearOverrideWeather();
  ClearWeatherTypePersist();
  SetWeatherTypeNowPersist(weather);
  SetWeatherTypeNow(weather);
  SetOverrideWeather(weather);
  cb({ ok: true });
});

// Clothes (FiveM-native)
regNui("ui_ped_setFreemode", async (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const gender = String(data?.gender ?? "male");
  const model = gender === "female" ? "mp_f_freemode_01" : "mp_m_freemode_01";
  const ok = await setModel(model);
  if (!ok) toast("Model konnte nicht geladen werden", false);
  cb({ ok });
});

regNui("ui_clothes_setComponent", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const ped = PlayerPedId();
  SetPedComponentVariation(
    ped,
    Number(data?.component ?? 11),
    Number(data?.drawable ?? 0),
    Number(data?.texture ?? 0),
    Number(data?.palette ?? 0)
  );
  cb({ ok: true });
});

regNui("ui_clothes_setProp", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const ped = PlayerPedId();

  const prop = Number(data?.component ?? 0);
  const drawable = Number(data?.drawable ?? 0);
  const texture = Number(data?.texture ?? 0);

  if (drawable < 0) ClearPedProp(ped, prop);
  else SetPedPropIndex(ped, prop, drawable, texture, true);

  cb({ ok: true });
});

regNui("devmenu_clothes_reset", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const ped = PlayerPedId();
  SetPedDefaultComponentVariation(ped);
  ClearAllPedProps(ped);
  cb({ ok: true });
});

// LastPos (server)
regNui("devmenu_pos_setPersistence", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  emitNet("goose:lastpos:setEnabled", !!data?.enabled);
  cb({ ok: true });
});

regNui("devmenu_pos_saveNow", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });

  const ped = PlayerPedId();
  const c = GetEntityCoords(ped);
  const h = GetEntityHeading(ped);

  emitNet("goose:lastpos:saveNow", { x: c[0], y: c[1], z: c[2], h });

  cb({ ok: true });
});


// World toggles
regNui("devmenu_world_setTraffic", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  trafficEnabled = !!data?.enabled;
  toast(trafficEnabled ? "KI Verkehr: AN" : "KI Verkehr: AUS");
  cb({ ok: true });
});
regNui("devmenu_world_setPolice", (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  policeEnabled = !!data?.enabled;
  toast(policeEnabled ? "Polizei: AN" : "Polizei: AUS");
  cb({ ok: true });
});

// Spawn preset / teleport
regNui("devmenu_spawn", async (data, cb) => {
  if (!devAllowed) return cb({ ok: false });
  const pos = {
    x: Number(data?.x ?? DEFAULT_SPAWN.x),
    y: Number(data?.y ?? DEFAULT_SPAWN.y),
    z: Number(data?.z ?? DEFAULT_SPAWN.z),
    h: Number(data?.h ?? DEFAULT_SPAWN.h),
  };
  await forceSpawnAt(pos, DEFAULT_MODEL);
  cb({ ok: true });
});

// --- Server events ---
onNet("goose:auth:response", (allowed) => {
  devAllowed = !!allowed;
});

onNet("goose:lastpos:state", (enabled) => {
  lastposEnabled = !!enabled;
  SendNUIMessage({ type: "lastpos", enabled: lastposEnabled });
});

setInterval(() => {
  if (!lastposEnabled) return;

  const ped = PlayerPedId();
  const c = GetEntityCoords(ped);
  const h = GetEntityHeading(ped);

  emitNet("goose:lastpos:saveNow", { x: c[0], y: c[1], z: c[2], h });
}, 10000);


onNet("goose:init:response", async (data) => {
  gotInit = true;

  const world = data?.world || {};
  trafficEnabled = world.trafficEnabledDefault !== false;
  policeEnabled = world.policeEnabledDefault === true;
  lastposEnabled = !!data?.lastposEnabled;


  SendNUIMessage({
    type: "init",
    hour: 12,
    weather: "CLEAR",
    trafficEnabled,
    policeEnabled,
    lastposEnabled: !!data?.lastposEnabled
  });

  await forceSpawnAt(data?.spawnPos || DEFAULT_SPAWN, String(data?.spawnPos?.model || DEFAULT_MODEL));
});

// --- Startup: Menü sicher zu + Init anfordern + Fallback-Spawn ---
let didRequestInit = false;

on("onClientResourceStart", (res) => {
  if (res !== GetCurrentResourceName()) return;

  setMenu(false);
  SendNUIMessage({ type: "menu", open: false });

  // Auth & init erst anfordern, wenn Session da ist
  (async () => {
    const ready = await waitForSessionReady();
    if (!ready) return;

    if (!didRequestInit) {
      didRequestInit = true;
      emitNet("goose:auth:request");
      emitNet("goose:init:request");
    }

    // Fallback Spawn nach 8s, aber NUR wenn init nicht gekommen ist
    setTimeout(async () => {
      if (!didSpawn) {
        await forceSpawnAt(DEFAULT_SPAWN, DEFAULT_MODEL);
      }
    }, 8000);
  })();
});

// Noch wichtiger: Beim ersten echten Spawn LoadingScreen beenden
on("playerSpawned", () => {
  shutdownLoadingScreensOnce();
});

