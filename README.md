# Goose Dev Menü 🦢 (FiveM)

**Version 1.0 – 09.02.2026**

Modernes Dev-Menü für **FiveM** mit Blur-UI, NoClip, Waffen/Repair-Hotkeys, Fahrzeug-Tools, Zeit/Wetter, Klamotten-Tester und optionaler Positionsspeicherung (Reconnect).

---

## ⚙️ Installation

1) Resource-Ordner in deinen `resources/` Ordner legen (z. B. `resources/[dev]/goose_devmenu`)

2) In deiner `server.cfg` starten:
```cfg
ensure goose_devmenu
```

3) In deiner `server.cfg` **entfernen**:
```cfg
ensure spawnmanager
ensure basic-gamemode
```

4) **ACE Permission** setzen (nur Admins dürfen das Menü nutzen):
```cfg
add_ace group.admin goose.dev allow
add_principal identifier.fivem:DEINE_ID group.admin
```

> Tipp: Deine FiveM-ID findest du im Client/Server-Log als `identifier.fivem:...`.

---

## 🧩 Funktionen

### 🗺️ Spawn / Reconnect Position (optional)
- **Letzte Position speichern** (per Menü aktivierbar)
- Position wird regelmäßig gespeichert und beim Reconnect wiederhergestellt
- Speicherung in: `lastpos.json` (im Resource-Ordner)

### 🚗 Fahrzeuge
- Fahrzeug spawnen per Texteingabe
- Türen öffnen/schließen einzeln
- Sitzplatz wechseln
- Fahrzeug reparieren (Button + Hotkey)

### 🕓 Zeit
- Zeit im Menü anzeigen
- Zeit mit ◀️/▶️ in Stundenschritten ändern (Client-seitig)

### 🌦️ Wetter
- Wetter im Menü anzeigen
- Wettertyp mit ◀️/▶️ ändern (Client-seitig)

### 🔫 Waffen
- Ein Klick → alle Waffen erhalten
- Zusätzlich per Hotkey

### 😶‍🌫️ NoClip
- Umschalten per Hotkey
- Optional: Beim Deaktivieren auf den Boden teleportieren (Config)

### 👕 Klamotten / DLC Tester (Freemode)
- Wechsel zwischen:
  - `mp_m_freemode_01` (Male)
  - `mp_f_freemode_01` (Female)
- Components/Props setzen (Drawable/Texture)
- Reset-Button + Auto-Reset beim Model-Wechsel

### 🌍 Welt-Optionen
- **KI-Verkehr** an/aus
- **Polizei/Wanted** an/aus

---

## 🕹️ Hotkeys

| Taste | Aktion |
|------:|--------|
| **F4** | Menü öffnen/schließen |
| **F3** | NoClip an/aus |
| **F9** | Alle Waffen geben |
| **F10** | Fahrzeug reparieren |

### 🎥 Kamera-Hinweis
Während das Menü offen ist, werden Controls blockiert, damit die Kamera nicht weiter bewegt wird. **F4** bleibt trotzdem nutzbar, um das Menü zu schließen.

---

## 🚀 NoClip-Steuerung

| Taste | Aktion |
|------:|--------|
| **W** | Vorwärts |
| **S** | Rückwärts |
| **A** | Links (seitlich) |
| **D** | Rechts (seitlich) |
| **Leertaste** | Hoch |
| **C** | Runter |
| **Shift** | Schneller |
| **Strg** | Langsamer |

---

## 🧾 Konfiguration (`config.json`)

Beispiel:
```json
{
  "spawn": { "x": 0.0, "y": 0.0, "z": 72.0, "h": 0.0, "model": "mp_m_freemode_01" },
  "world": { "trafficEnabledDefault": true, "policeEnabledDefault": false },
  "noclip": { "teleportToGroundOnExit": true }
}
```

- `spawn`: Default-Spawnpunkt, falls keine LastPos gesetzt ist
- `world.trafficEnabledDefault`: KI-Verkehr standardmäßig aktiv?
- `world.policeEnabledDefault`: Polizei/Wanted standardmäßig aktiv?
- `noclip.teleportToGroundOnExit`: Beim NoClip-Off auf Boden setzen

---

## 📁 Struktur (Resource)

- `fxmanifest.lua`  
  Resource-Manifest
- `client/client.js`  
  Menülogik, NUI-Callbacks, Zeit/Wetter, Welt-Optionen, Spawn
- `client/noclip.js`  
  NoClip-Logik (Kamera-Relativ, Speed-Stufen, Ground-Teleport optional)
- `server/server.js`  
  Auth (ACE), Init/Defaults, LastPos speichern (`lastpos.json`)
- `html/index.html`  
  UI (Blur-Menü)
- `html/script.js`  
  UI-Frontend-Logik (NUI Messages + Fetch zu Client)

---

## 🔌 Kommunikation

- **NUI → Client**: `fetch("https://<resource>/<callback>", ...)` / `__cfx_nui:*`
- **Client → NUI**: `SendNUIMessage({ type: "...", ... })`
- **Client ↔ Server**: `emitNet(...)` / `onNet(...)`

---

## 💾 Speicherung

### Serverseitig
- LastPos (wenn aktiviert) in `lastpos.json`

### Client/UI
- UI-Eingaben bleiben erhalten, bis sie manuell geändert/zurückgesetzt werden.

---

Viel Spaß mit **Goose Dev Menü** 🦢

