(() => {
  const Delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function readConfig() {
    try {
      const raw = LoadResourceFile(GetCurrentResourceName(), "config.json");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  const CONFIG = readConfig();
  const TELEPORT_TO_GROUND_ON_EXIT = !!(CONFIG?.noclip?.teleportToGroundOnExit);

  function degToRad(v) {
    return v * (Math.PI / 180.0);
  }

  function getCamForward() {
    const rot = GetGameplayCamRot(2);
    const pitch = degToRad(rot[0]);
    const yaw = degToRad(rot[2]);

    const x = -Math.sin(yaw) * Math.cos(pitch);
    const y =  Math.cos(yaw) * Math.cos(pitch);
    const z =  Math.sin(pitch);
    return [x, y, z];
  }

  // FIX: korrekt rechts relativ zur Kamera (A/D nicht vertauscht)
  function getCamRight() {
    const rot = GetGameplayCamRot(2);
    const yaw = degToRad(rot[2]);
    return [Math.cos(yaw), Math.sin(yaw), 0.0];
  }

  const state = { enabled: false, speed: 0.35 };

  async function start() {
    if (state.enabled) return;
    state.enabled = true;

    const ped = PlayerPedId();
    SetEntityCollision(ped, false, false);
    FreezeEntityPosition(ped, true);
    SetEntityInvincible(ped, true);
  }

  async function raycastGroundZ(x, y, zFrom) {
    // Raycast von oben nach unten (sehr robust)
    const zTop = zFrom + 1000.0;
    const zBottom = zFrom - 2000.0;

    const handle = StartShapeTestRay(x, y, zTop, x, y, zBottom, 1, PlayerPedId(), 0);
    const res = GetShapeTestResult(handle);

    // res: [retval, hit, endCoords, surfaceNormal, entityHit]
    if (Array.isArray(res) && res[1] === 1 && Array.isArray(res[2])) {
      return res[2][2]; // Z vom Trefferpunkt
    }
    return null;
  }

  async function stop() {
    if (!state.enabled) return;
    state.enabled = false;

    const ped = PlayerPedId();

    // Ped erstmal "halten", damit er nicht direkt fällt
    FreezeEntityPosition(ped, true);

    // Collision wieder an (aber noch gefreezed)
    SetEntityCollision(ped, true, true);
    SetEntityInvincible(ped, false);

    if (TELEPORT_TO_GROUND_ON_EXIT && !IsPedInAnyVehicle(ped, false)) {
      const c = GetEntityCoords(ped);
      const x = c[0], y = c[1], z = c[2];

      // Collision um den Punkt laden (hilft Raycast/grounding)
      RequestCollisionAtCoord(x, y, z);

      let startTime = GetGameTimer();
      while (!HasCollisionLoadedAroundEntity(ped)) {
        await Delay(0);
        if (GetGameTimer() - startTime > 1500) break;
      }

      // 1) Raycast probieren (beste Chance)
      let groundZ = await raycastGroundZ(x, y, z);

      // 2) Fallback: GroundZFor_3dCoord
      if (groundZ === null) {
        for (const h of [z + 25.0, z + 75.0, z + 150.0, 1000.0]) {
          const r = GetGroundZFor_3dCoord(x, y, h, false);
          if (Array.isArray(r) && r[0] === true && typeof r[1] === "number") {
            groundZ = r[1];
            break;
          }
          await Delay(0);
        }
      }

      if (groundZ !== null) {
        // Teleport + sicherstellen, dass keine Fallgeschwindigkeit bleibt
        SetEntityCoordsNoOffset(ped, x, y, groundZ + 0.35, false, false, false);
        SetEntityVelocity(ped, 0.0, 0.0, 0.0);
      }
    }

    // Ped wieder freigeben
    FreezeEntityPosition(ped, false);
  }


  function toggle() {
    state.enabled ? stop() : start();
  }

  function tick() {
    if (!state.enabled) return;

    const ped = PlayerPedId();
    const pos = GetEntityCoords(ped);

    let speed = state.speed;
    if (IsControlPressed(0, 21)) speed *= 2.0;   // SHIFT schneller
    if (IsControlPressed(0, 36)) speed *= 0.2;  // CTRL langsamer (NICHT runter)

    const fwd = getCamForward();
    const right = getCamRight();

    let x = pos[0], y = pos[1], z = pos[2];

    // W/S
    if (IsControlPressed(0, 32)) { x += fwd[0] * speed; y += fwd[1] * speed; z += fwd[2] * speed; } // W
    if (IsControlPressed(0, 33)) { x -= fwd[0] * speed; y -= fwd[1] * speed; z -= fwd[2] * speed; } // S

    // A/D (korrekt)
    if (IsControlPressed(0, 34)) { x -= right[0] * speed; y -= right[1] * speed; } // A
    if (IsControlPressed(0, 35)) { x += right[0] * speed; y += right[1] * speed; } // D

    // Höhe: SPACE hoch, C runter
    if (IsControlPressed(0, 22)) z += speed; // SPACE
    if (IsControlPressed(0, 26)) z -= speed; // C

    SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
  }

  setTick(tick);

  globalThis.__gooseNoclipToggle = toggle;
  globalThis.__gooseNoclipEnabled = () => state.enabled;
})();
