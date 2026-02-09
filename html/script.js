const STORAGE_KEY = 'devmenu:clothesForm:v2';

const WEATHER_TYPES = [
  'CLEAR','EXTRASUNNY','CLOUDS','OVERCAST','RAIN','THUNDER','SMOG',
  'FOGGY','XMAS','SNOWLIGHT','BLIZZARD','NEUTRAL','CLEARING','SNOW','HALLOWEEN'
];

const CLOTHES_COMPONENTS = [
  { value: 0, label: 'Head' },
  { value: 1, label: 'Mask' },
  { value: 2, label: 'Hair' },
  { value: 3, label: 'Torso' },
  { value: 4, label: 'Legs' },
  { value: 5, label: 'Bags' },
  { value: 6, label: 'Shoes' },
  { value: 7, label: 'Accessories' },
  { value: 8, label: 'Undershirt' },
  { value: 9, label: 'Body Armor' },
  { value: 10, label: 'Decals' },
  { value: 11, label: 'Top' }
];

const PROP_COMPONENTS = [
  { value: 0, label: 'Hat' },
  { value: 1, label: 'Glasses' },
  { value: 2, label: 'Ears' },
  { value: 6, label: 'Watch' },
  { value: 7, label: 'Bracelet' }
];

let currentHour = 12;
let currentWeatherIndex = 0;

function $(id) { return document.getElementById(id); }

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function showToast(message, ok = true) {
  const toast = $('toast');
  const toastMsg = $('toastMessage');
  if (!toast || !toastMsg) return;

  toast.style.background = ok ? '#10b981' : '#ef4444';
  toastMsg.textContent = String(message);
  toast.style.display = 'flex';

  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

async function nui(action, data = {}) {
  // alt:V kompatibel lassen
  if ('alt' in window) return;

  const res = (typeof GetParentResourceName === 'function')
    ? GetParentResourceName()
    : 'goose_devmenu';

  try {
    const r = await fetch(`https://${res}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data)
    });
    try { return await r.json(); } catch { return {}; }
  } catch {
    return {};
  }
}

/**
 * alt.emit(name, ...) Ersatz:
 * Wir mappen die alten Namen auf FiveM-NUI Actions.
 */
function emit(name, ...args) {
  if ('alt' in window) {
    window.alt.emit(name, ...args);
    return;
  }

  const map = {
    'spawnVehicle': () => nui('spawnVehicle', { name: args[0] }),
    'repairVehicle': () => nui('repairVehicle', {}),
    'toggleDoor': () => nui('toggleDoor', { doorIndex: args[0] }),
    'toggleSeat': () => nui('toggleSeat', { seatIndex: args[0] }),
    'giveAllWeapons': () => nui('giveAllWeapons', {}),
    'requestPlayerCoords': () => nui('requestPlayerCoords', {}),

    'clientTime:change': () => nui('clientTime_change', { hour: args[0] }),
    'clientWeather:change': () => nui('clientWeather_change', { weather: args[0] }),

    'ui:ped:setFreemode': () => nui('ui_ped_setFreemode', { gender: args[0] }),

    // Clothes (FiveM)
    'ui:clothes:setDlcClothes': () => nui('ui_clothes_setComponent', args[0]),
    'ui:clothes:setDlcProp': () => nui('ui_clothes_setProp', args[0]),
    'devmenu:clothes:reset': () => nui('devmenu_clothes_reset', {}),

    // LastPos
    'devmenu:pos:setPersistence': () => nui('devmenu_pos_setPersistence', { enabled: !!args[0] }),
    'devmenu:pos:saveNow': () => nui('devmenu_pos_saveNow', {}),

    // World
    'devmenu:world:setTraffic': () => nui('devmenu_world_setTraffic', { enabled: !!args[0] }),
    'devmenu:world:setPolice': () => nui('devmenu_world_setPolice', { enabled: !!args[0] }),

    // Spawn
    'devmenu:spawn': () => nui('devmenu_spawn', args[0])
  };

  if (map[name]) map[name]();
}

function toggleSubmenu(submenuId, buttonId) {
  const submenu = $(submenuId);
  const button = $(buttonId);
  if (!submenu || !button) return;

  const isActive = button.classList.contains('active');
  button.classList.toggle('active', !isActive);
}

function changeHour(delta) {
  currentHour += delta;
  if (currentHour < 0) currentHour = 23;
  if (currentHour > 23) currentHour = 0;

  setText('clientTimeLabel', ` ${currentHour}`);
  emit('clientTime:change', currentHour);
}

function changeWeather(delta) {
  currentWeatherIndex += delta;
  if (currentWeatherIndex < 0) currentWeatherIndex = WEATHER_TYPES.length - 1;
  if (currentWeatherIndex >= WEATHER_TYPES.length) currentWeatherIndex = 0;

  const weatherName = WEATHER_TYPES[currentWeatherIndex];
  setText('clientWeatherLabel', weatherName);
  emit('clientWeather:change', weatherName);
}

function spawnCustomVehicle() {
  const name = $('vehicleInput')?.value?.trim() ?? '';
  if (!name.length) return showToast('Bitte Fahrzeugnamen eingeben.', false);

  emit('spawnVehicle', name);
  showToast(`Spawne: ${name}`);
}

function repairVehicle() {
  emit('repairVehicle');
  showToast('Fahrzeug repariert');
}

function toggleDoor(index) { emit('toggleDoor', Number(index)); }
function toggleSeat(index) { emit('toggleSeat', Number(index)); }

function giveAllWeapons() {
  emit('giveAllWeapons');
  showToast('Alle Waffen angefordert');
}

function getPlayerCoords() {
  emit('requestPlayerCoords');
  showToast('Position in F8-Konsole');
}

// ---- World Toggles ----
const TRAFFIC_KEY = "devmenu:traffic";
const POLICE_KEY = "devmenu:police";

function setSelect(id, enabled) {
  const el = $(id);
  if (!el) return;
  el.value = enabled ? "on" : "off";
}

function getSelect(id) {
  const el = $(id);
  if (!el) return true;
  return el.value === "on";
}

function saveLocal(key, enabled) {
  try { localStorage.setItem(key, enabled ? "1" : "0"); } catch {}
}

function loadLocal(key, def) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === "1";
  } catch {
    return def;
  }
}

function onTrafficChanged() {
  const enabled = getSelect("trafficSelect");
  saveLocal(TRAFFIC_KEY, enabled);
  emit("devmenu:world:setTraffic", enabled);
}

function onPoliceChanged() {
  const enabled = getSelect("policeSelect");
  saveLocal(POLICE_KEY, enabled);
  emit("devmenu:world:setPolice", enabled);
}

// ---- Spawn Presets ----
function spawnPreset() {
  const v = $("spawnPreset")?.value ?? "";
  const parts = v.split(",").map((x) => Number(x));
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) {
    return showToast("Ungültiger Spawnpunkt", false);
  }
  emit("devmenu:spawn", { x: parts[0], y: parts[1], z: parts[2], h: parts[3] });
}

// ---- Clothes (FiveM) ----
function populateComponentSelect(type) {
  const select = $('dlcComponentSelect');
  if (!select) return;

  const data = type === 'prop' ? PROP_COMPONENTS : CLOTHES_COMPONENTS;
  const old = select.value;

  select.innerHTML = '';
  for (const item of data) {
    const opt = document.createElement('option');
    opt.value = String(item.value);
    opt.textContent = `${item.label}`;
    select.appendChild(opt);
  }

  if (old && Array.from(select.options).some(o => o.value === old)) select.value = old;
  else select.value = String(data[0]?.value ?? 0);
}

function onTypeChange() {
  const type = $('dlcType')?.value ?? 'clothes';
  const paletteRow = $('paletteRow');
  const applyOnlyRow = $('applyOnlyRow');

  populateComponentSelect(type);

  if (paletteRow && applyOnlyRow) {
    if (type === 'prop') {
      paletteRow.style.display = 'none';
      applyOnlyRow.style.display = 'grid';
    } else {
      paletteRow.style.display = 'grid';
      applyOnlyRow.style.display = 'none';
    }
  }

  persistClothesInputs();
}

function getClothesFormState() {
  return {
    freemodeGender: $('freemodeGender')?.value ?? 'male',
    dlcType: $('dlcType')?.value ?? 'clothes',
    dlcComponent: Number($('dlcComponentSelect')?.value ?? 0),
    dlcDrawable: Number($('dlcDrawable')?.value ?? 0),
    dlcTexture: Number($('dlcTexture')?.value ?? 0),
    dlcPalette: Number($('dlcPalette')?.value ?? 0)
  };
}

function applyClothesFormState(state) {
  if (!state) return;

  if ($('freemodeGender')) $('freemodeGender').value = state.freemodeGender ?? 'male';
  if ($('dlcType')) $('dlcType').value = state.dlcType ?? 'clothes';

  onTypeChange();

  if ($('dlcComponentSelect')) $('dlcComponentSelect').value = String(state.dlcComponent ?? 0);
  if ($('dlcDrawable')) $('dlcDrawable').value = String(state.dlcDrawable ?? 0);
  if ($('dlcTexture')) $('dlcTexture').value = String(state.dlcTexture ?? 0);
  if ($('dlcPalette')) $('dlcPalette').value = String(state.dlcPalette ?? 0);
}

function persistClothesInputs() {
  try {
    const state = getClothesFormState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadClothesInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearClothesInputs() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}

  applyClothesFormState({
    freemodeGender: 'male',
    dlcType: 'clothes',
    dlcComponent: 11,
    dlcDrawable: 0,
    dlcTexture: 0,
    dlcPalette: 0
  });

  showToast('Eingaben geleert');
}

function applyFreemode() {
  const gender = $('freemodeGender')?.value ?? 'male';
  emit('ui:ped:setFreemode', gender);
  emit('devmenu:clothes:reset');
  persistClothesInputs();
  showToast(`Model gewechselt: ${gender}`);
}

function resetClothes() {
  emit('devmenu:clothes:reset');
  showToast('Reset gesendet');
}

function applyDlc() {
  const type = $('dlcType')?.value ?? 'clothes';
  const component = Number($('dlcComponentSelect')?.value ?? 0);
  const drawable = Number($('dlcDrawable')?.value ?? 0);
  const texture = Number($('dlcTexture')?.value ?? 0);
  const palette = Number($('dlcPalette')?.value ?? 0);

  if (type === 'prop') {
    emit('ui:clothes:setDlcProp', { component, drawable, texture });
  } else {
    emit('ui:clothes:setDlcClothes', { component, drawable, texture, palette });
  }

  persistClothesInputs();
  showToast(`Gesetzt: ${type} ${component}/${drawable}/${texture}`);
}

function wireClothesPersistence() {
  const ids = ['freemodeGender','dlcType','dlcComponentSelect','dlcDrawable','dlcTexture','dlcPalette'];
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    const evt = (el.tagName === 'SELECT' || el.type === 'number') ? 'change' : 'input';
    el.addEventListener(evt, persistClothesInputs);
  }
}

// ---- LastPos UI ----
function setPersistSelect(enabled) {
  const el = $('persistLastPosSelect');
  if (!el) return;
  el.value = enabled ? 'on' : 'off';
}

function onPersistLastPosChanged() {
  const enabled = $('persistLastPosSelect')?.value === 'on';
  emit('devmenu:pos:setPersistence', enabled);
  showToast(enabled ? 'Positionsspeicherung: AN' : 'Positionsspeicherung: AUS');
}

function saveLastPosNow() {
  emit('devmenu:pos:saveNow');
  showToast('Position speichern angefordert');
}

function clearLastPosLocal() {
  // Server speichert den State. Wir schalten nur aus:
  setPersistSelect(false);
  emit('devmenu:pos:setPersistence', false);
  showToast('Positionsspeicherung deaktiviert');
}

// ---- Message Listener (FiveM) ----
window.addEventListener("message", (event) => {
  const msg = event.data || {};

  if (msg.type === "menu") {
    document.body.style.display = msg.open ? "flex" : "none";
  }

  if (msg.type === "toast") {
    showToast(msg.message ?? "OK", !!msg.ok);
  }

  if (msg.type === "noclip") {
    const overlay = document.getElementById("noclipOverlay");
    if (overlay) overlay.style.display = data.enabled ? "block" : "none";
  }

  if (msg.type === "init") {
    // Defaults rein
    const h = Number(msg.hour ?? 12);
    if (Number.isFinite(h)) currentHour = Math.max(0, Math.min(23, h));

    const w = String(msg.weather ?? "CLEAR").toUpperCase();
    const idx = WEATHER_TYPES.indexOf(w);
    currentWeatherIndex = idx >= 0 ? idx : 0;

    setText('clientTimeLabel', ` ${currentHour}`);
    setText('clientWeatherLabel', WEATHER_TYPES[currentWeatherIndex]);

    setSelect("trafficSelect", msg.trafficEnabled !== false);
    setSelect("policeSelect", msg.policeEnabled === true);
    setPersistSelect(!!msg.lastposEnabled);
  }

  if (msg.type === "lastpos") {
    setPersistSelect(!!msg.enabled);
  }
});

// ESC schließt Menü
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    nui("closeMenu", {});
  }
});

// ---- Exports für HTML onclick ----
window.toggleSubmenu = toggleSubmenu;
window.changeHour = changeHour;
window.changeWeather = changeWeather;
window.spawnCustomVehicle = spawnCustomVehicle;
window.repairVehicle = repairVehicle;
window.toggleDoor = toggleDoor;
window.toggleSeat = toggleSeat;
window.giveAllWeapons = giveAllWeapons;
window.getPlayerCoords = getPlayerCoords;

window.onTypeChange = onTypeChange;
window.applyDlc = applyDlc;
window.applyFreemode = applyFreemode;
window.clearClothesInputs = clearClothesInputs;
window.resetClothes = resetClothes;

window.onPersistLastPosChanged = onPersistLastPosChanged;
window.saveLastPosNow = saveLastPosNow;
window.clearLastPosLocal = clearLastPosLocal;

window.onTrafficChanged = onTrafficChanged;
window.onPoliceChanged = onPoliceChanged;
window.spawnPreset = spawnPreset;

document.addEventListener('DOMContentLoaded', () => {
  document.body.style.display = "none"; // startet geschlossen

  populateComponentSelect($('dlcType')?.value ?? 'clothes');
  onTypeChange();

  const saved = loadClothesInputs();
  if (saved) applyClothesFormState(saved);
  else applyClothesFormState({
    freemodeGender: 'male',
    dlcType: 'clothes',
    dlcComponent: 11,
    dlcDrawable: 0,
    dlcTexture: 0,
    dlcPalette: 0
  });

  wireClothesPersistence();

  // World toggles local defaults (werden später auch per init überschrieben)
  setSelect("trafficSelect", loadLocal(TRAFFIC_KEY, true));
  setSelect("policeSelect", loadLocal(POLICE_KEY, false));

  emit("devmenu:world:setTraffic", getSelect("trafficSelect"));
  emit("devmenu:world:setPolice", getSelect("policeSelect"));
});
