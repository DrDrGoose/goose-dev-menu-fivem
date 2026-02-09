
# Goose DevMenu (FiveM) — Modernes Dev-/Admin-Menü

  

Ein schlankes Dev-Menü für **FiveM**, gedacht für **Test- & Entwicklungsserver**.

Es ersetzt klassische “Freeroam”-Funktionen nicht komplett, sondern bietet dir ein zentrales UI mit praktischen Tools wie:

  

- ✅ Menü per **F4** öffnen/schließen

- ✅ NoClip per **F3** (inkl. HUD/Overlay via NUI-Message)

- ✅ Alle Waffen geben (**F9** / Command)

- ✅ Fahrzeug reparieren (**F10** / Command)

- ✅ Fahrzeug spawnen + Türen/Sitze steuern

- ✅ Zeit/Weather clientseitig setzen

- ✅ Kleidung (Freemode) anpassen

- ✅ Welt-Optionen (KI-Verkehr / Polizei)

- ✅ Last-Position speichern (serverseitig in `lastpos.json`)

  

> ⚠️ **Hinweis:** Dieses Menü ist für Dev-/Admin-Zwecke gedacht. Nicht auf öffentlichen Servern ohne Berechtigungssystem verwenden.

  

---

  

## Voraussetzungen

  

- FiveM Server (FXServer) mit aktivem NodeJS (Standard)

- Eine Resource-Ordnerstruktur wie unten beschrieben

- Admin-ACE Rechte für dein Identifier (siehe Setup)

  

---

  

## Installation

  

### 1) Resource ablegen

Lege den Ordner `goose_devmenu` in deinen `resources/` Ordner.

  

Beispiel:

  

```text

resources/

 - goose_devmenu/
 -- fxmanifest.lua
 -- config.json
 -- client/
 --- client.js
 --- noclip.js
 -- server/
 --- server.js
 -- html/
 --- index.html
 --- script.js
```


---

  

### 2) `server.cfg` anpassen

Füge die Resource hinzu:

  

```cfg

ensure goose_devmenu

```

  

Gib dir selbst Rechte:

  

```cfg

add_principal identifier.fivem:DEINEID group.admin

add_ace group.admin goose.dev allow

```

  

> Ersetze `DEINEID` durch deine FiveM-ID (z.B. `identifier.fivem:XXXXXX`).

  

---

  

### 3) `fxmanifest.lua` prüfen

  

Dein Manifest muss Client, Server und NUI korrekt laden.

  

Beispiel:

  

```lua

fx_version  'cerulean'

game  'gta5'

author  'DrDrGoose'

description  'Goose DevMenu'

version  '1.0.0'

ui_page  'html/index.html'

files {

'html/index.html',

'html/script.js',

'html/*.css',

'html/*.png',

'config.json'

}

client_scripts {

'client/noclip.js',

'client/client.js'

}

server_scripts {

'server/server.js'

}

```

---

  

## Konfiguration (`config.json`)

  

Beispiel:

  

```json

{

"spawn": {
"x": 0.0,
"y": 0.0,
"z": 72.0,
"h": 0.0,
"model": "mp_m_freemode_01"
},

"world": {
"trafficEnabledDefault": true,
"policeEnabledDefault": false
},

"noclip": {
"teleportToGroundOnExit": true
}

}

```

  

### Optionen erklärt

  

-  `spawn`: Standard-Spawn, wenn keine LastPos vorhanden ist

-  `world.trafficEnabledDefault`: KI-Verkehr Standard an/aus

-  `world.policeEnabledDefault`: Polizei/Wanted/Dispatch Standard an/aus

-  `noclip.teleportToGroundOnExit`: Wenn NoClip beendet wird, wird versucht auf den Boden zu “snappen”

  

---

  

## Bedienung (Hotkeys & Commands)

  

### Hotkeys

  

| Taste | Funktion |

| **F4** | Menü öffnen/schließen |

| **F3** | NoClip an/aus |

| **F9** | Alle Waffen geben |

| **F10** | Fahrzeug reparieren |

  

### Commands (F8 Konsole / Chat)

  

| Command | Funktion |

| --- | --- |

| `/goosemenu` | Menü toggle |

| `/goosenoclip` | NoClip toggle |

| `/gooseweapons` | Alle Waffen geben |

| `/gooserepair` | Repariert aktuelles Fahrzeug |

  

> ⚠️ **Nur mit Berechtigung** (`goose.dev`) nutzbar.

  

---

  

## Berechtigungssystem (ACE)

  

Das Menü prüft serverseitig:

  

-  `IsPlayerAceAllowed(src, "goose.dev")`

  

### Beispiel-Setup

  

```cfg

add_ace group.admin goose.dev allow

add_principal identifier.fivem:DEINEID group.admin

```

  

Wenn du willst, kannst du auch direkt einem Identifier die Permission geben:

  

```cfg

add_ace identifier.fivem:DEINEID goose.dev allow

```

  

---

  

## Last Position (`lastpos.json`)

  

Wenn LastPos aktiviert wird, speichert der Server die letzte Position in:

  

```text

goose_devmenu/lastpos.json

```

  

### Funktionsweise

  

- Client sendet Koordinaten (alle 10s), wenn aktiviert

- Server speichert pro Spieler anhand `license:` / `fivem:` / Fallback `src:ID`

---

  

## Troubleshooting

  

### „Awaiting scripts“ beim Join

  

- Stelle sicher, dass keine Fehler in F8 Konsole auftreten

- Spawn/Model-Änderungen dürfen erst erfolgen, wenn die Network-Session bereit ist

- Prüfe, ob `client.js` und `server.js` sauber getrennt sind

-  `fxmanifest.lua` Pfade prüfen

  

### Menü lässt sich nicht mit F4 schließen

  

Schließe das Menü über  `ESC`

---

  

## Sicherheit / Hinweise

  

- Nicht für Live-Server ohne zusätzliche Rechte-/Logik

- Waffen-/Repair-/Spawn-Funktionen sind dev-only

- Wir empfehlen, die Resource nur für Admins zu starten

  

---

  

## Credits

  

- UI/DevMenu: DrDrGoose

- Anpassungen/Fehlerfixes: Community / eigene Weiterentwicklung

  

---

  

## Lizenz

  

Private/Dev-Nutzung frei (je nach Repo/Projekt).

Wenn du es öffentlich teilst, setze bitte Credits und prüfe die Lizenzbedingungen deines ursprünglichen Repos.
