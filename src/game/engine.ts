import * as THREE from "three";
import { buildViewModel, makeToonGradient, type Box } from "./world";
import { buildNightclub } from "./nightclub";
import { saveGame, type SaveData } from "./save";
import { WEAPONS, type WeaponDef } from "./progression";

export type EngineHandle = {
  dispose: () => void;
  requestPointerLock: () => void;
  save: () => void;
};

export type LoadoutState = {
  unlocked: string[];
  weapon: string;
  /** Set when a weapon was just earned, for the HUD toast. */
  justUnlocked?: string;
};

const PLAYER_RADIUS = 0.5;
const EYE_HEIGHT = 1.7;
const WALK = 6.0;
const SPRINT = 10.0;
const ACCEL = 42; // ground acceleration (units/s^2)
const FRICTION = 12; // deceleration factor when input stops

export function createEngine(
  canvas: HTMLCanvasElement,
  start: Pick<SaveData, "position" | "yaw" | "chapter" | "unlocked" | "weapon">,
  onLockChange: (locked: boolean) => void,
  onLoadout: (state: LoadoutState) => void = () => {},
): EngineHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0f2e, 18, 62);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 240);

  const gradient = makeToonGradient();
  const { root, colliders, animated, bounds, floorTiles, pickups } = buildNightclub(gradient);
  scene.background = new THREE.Color(0x120c22);
  scene.add(root);

  // Viewmodel lives on a separate near-plane scene so it never clips walls.
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(55, 1, 0.01, 5);
  // --- loadout / progression state
  const unlocked = new Set(start.unlocked?.length ? start.unlocked : [WEAPONS[0]!.id]);
  let weapon: WeaponDef =
    WEAPONS.find((w) => w.id === start.weapon && unlocked.has(w.id)) ?? WEAPONS[0]!;

  const viewRig = new THREE.Group();
  let viewModel = buildViewModel(gradient, weapon);
  viewRig.add(viewModel);

  const emitLoadout = (justUnlocked?: string) =>
    onLoadout({ unlocked: [...unlocked], weapon: weapon.id, justUnlocked });

  function equip(next: WeaponDef, justUnlocked?: string) {
    weapon = next;
    viewRig.remove(viewModel);
    viewModel.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.material && !Array.isArray(m.material)) m.material.dispose?.();
    });
    viewModel = buildViewModel(gradient, weapon);
    viewRig.add(viewModel);
    emitLoadout(justUnlocked);
  }
  emitLoadout();
  viewScene.add(viewRig);
  viewScene.add(new THREE.HemisphereLight(0xffe6f2, 0x3a2a5a, 1.5));
  const viewKey = new THREE.DirectionalLight(0xffffff, 2.2);
  viewKey.position.set(-1, 2, 2);
  viewScene.add(viewKey);

  const player = new THREE.Vector3(start.position[0], EYE_HEIGHT, start.position[2]);
  const velocity = new THREE.Vector2(0, 0);
  let yaw = start.yaw;
  let pitch = 0;
  let bobTime = 0;
  let swayX = 0;
  let swayY = 0;
  let recoil = 0;

  const keys = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
    // Quick-select an earned weapon with 1-4
    const slot = Number(e.code.replace("Digit", ""));
    if (e.code.startsWith("Digit") && slot >= 1 && slot <= WEAPONS.length) {
      const w = WEAPONS[slot - 1]!;
      if (unlocked.has(w.id) && w.id !== weapon.id) equip(w);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * 0.0021;
    pitch -= e.movementY * 0.0021;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
    swayX += e.movementX * 0.00035;
    swayY += e.movementY * 0.00035;
  };

  const onMouseDown = () => {
    if (document.pointerLockElement !== canvas) return;
    recoil = 1; // placeholder feedback until weapons are implemented
  };

  const onLock = () => onLockChange(document.pointerLockElement === canvas);

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewCamera.aspect = w / h;
    viewCamera.updateProjectionMatrix();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("resize", resize);
  document.addEventListener("pointerlockchange", onLock);
  resize();

  function collide(next: THREE.Vector3) {
    for (const b of colliders as Box[]) {
      const cx = Math.max(b.minX, Math.min(next.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(next.z, b.maxZ));
      const dx = next.x - cx;
      const dz = next.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < PLAYER_RADIUS * PLAYER_RADIUS) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = (PLAYER_RADIUS - d) / d;
        next.x += dx * push;
        next.z += dz * push;
      }
    }
    // Keep the player inside the club
    next.x = Math.max(-bounds.x, Math.min(bounds.x, next.x));
    next.z = Math.max(-bounds.z, Math.min(bounds.z, next.z));
  }

  const wish = new THREE.Vector2();
  let last = performance.now();
  let raf = 0;
  let autosave = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // --- input -> wish direction in world space
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    wish.set(0, 0);
    if (keys.has("KeyW") || keys.has("ArrowUp")) wish.x += fx, (wish.y += fz);
    if (keys.has("KeyS") || keys.has("ArrowDown")) wish.x -= fx, (wish.y -= fz);
    if (keys.has("KeyD") || keys.has("ArrowRight")) wish.x += -fz, (wish.y += fx);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) wish.x -= -fz, (wish.y -= fx);

    const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const maxSpeed = sprinting ? SPRINT : WALK;

    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(maxSpeed);
      // exponential approach = smooth acceleration
      const t = 1 - Math.exp(-(ACCEL / maxSpeed) * dt);
      velocity.lerp(wish, t);
    } else {
      velocity.multiplyScalar(Math.exp(-FRICTION * dt));
      if (velocity.lengthSq() < 0.0004) velocity.set(0, 0);
    }

    if (velocity.lengthSq() > 0) {
      player.x += velocity.x * dt;
      player.z += velocity.y * dt;
      collide(player);
    }

    // --- head bob driven by actual speed
    const speed = velocity.length();
    bobTime += dt * speed * 1.5;
    const bobAmp = Math.min(speed / SPRINT, 1) * 0.055;
    const bobY = Math.sin(bobTime * 2) * bobAmp;
    const bobX = Math.cos(bobTime) * bobAmp * 0.6;

    camera.position.set(player.x + bobX * 0.4, player.y + bobY, player.z);
    camera.rotation.set(pitch, yaw, Math.sin(bobTime) * bobAmp * 0.12, "YXZ");

    // --- viewmodel sway, bob and recoil kick
    swayX = THREE.MathUtils.damp(swayX, 0, 8, dt);
    swayY = THREE.MathUtils.damp(swayY, 0, 8, dt);
    recoil = THREE.MathUtils.damp(recoil, 0, 9, dt);
    viewRig.position.set(
      THREE.MathUtils.clamp(-swayX, -0.06, 0.06) + bobX * 0.5,
      THREE.MathUtils.clamp(-swayY, -0.06, 0.06) + bobY * 0.7 - recoil * 0.02,
      recoil * 0.06,
    );
    viewRig.rotation.set(-recoil * 0.18, Math.sin(bobTime) * bobAmp * 0.5, 0);

    // --- ambient world animation (cheap)
    for (const o of animated.spin) {
      o.rotation.y += dt * 1.4;
      o.position.y += Math.sin(now * 0.002 + o.position.x) * dt * 0.35;
    }
    // --- weapon pickups: walk over a can to earn the next weapon
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i]!;
      const dx = p.position.x - player.x;
      const dz = p.position.z - player.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) {
        const next = WEAPONS.find((w) => !unlocked.has(w.id));
        pickups.splice(i, 1);
        const spinIdx = animated.spin.indexOf(p);
        if (spinIdx >= 0) animated.spin.splice(spinIdx, 1);
        p.removeFromParent();
        if (next) {
          unlocked.add(next.id);
          equip(next, next.name);
        }
      }
    }

    // --- dance floor pulses on a steady 128 BPM beat
    const beat = (now * 0.002133) % 1;
    for (let i = 0; i < floorTiles.length; i++) {
      const t = floorTiles[i]!;
      const m = t.material as THREE.MeshBasicMaterial;
      const k = 0.35 + 0.65 * Math.abs(Math.sin(beat * Math.PI + (t.userData['phase'] as number)));
      m.color.setHSL(((i * 0.07 + now * 0.00008) % 1), 0.85, 0.25 + k * 0.35);
    }

    for (let i = 0; i < animated.flicker.length; i++) {
      const l = animated.flicker[i]!;
      l.intensity =
        (l.userData['base'] ??= l.intensity) *
        (0.86 + Math.sin(now * 0.006 + i * 2.1) * 0.1 + Math.random() * 0.04);
    }

    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
    renderer.autoClear = true;

    autosave += dt;
    if (autosave > 10) {
      autosave = 0;
      persist();
    }
  };

  function persist() {
    saveGame({
      chapter: start.chapter,
      position: [player.x, player.y, player.z],
      yaw,
      unlocked: [...unlocked],
      weapon: weapon.id,
    });
  }

  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      persist();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerlockchange", onLock);
      for (const s of [scene, viewScene]) {
        s.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
      }
      renderer.dispose();
    },
    requestPointerLock() {
      canvas.requestPointerLock();
    },
    save: persist,
  };
}
