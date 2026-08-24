import * as THREE from "three";
import { buildViewModel, makeToonGradient, type Box, type LevelResult } from "./world";
import { buildNightclub } from "./nightclub";
import { buildCity } from "./city";
import { saveGame, type SaveData } from "./save";
import { WEAPONS, type WeaponDef } from "./progression";
import { CLUB_INTRO, lineAt, sampleCutscene, type CutsceneLine } from "./cutscene";

export type EngineHandle = {
  dispose: () => void;
  requestPointerLock: () => void;
  save: () => void;
  skipCutscene: () => void;
};

export type CutsceneState = {
  active: boolean;
  /** 0..1 progress through the scene. */
  progress: number;
  line: CutsceneLine | null;
};

export type LoadoutState = {
  unlocked: string[];
  weapon: string;
  /** Set when a weapon was just earned, for the HUD toast. */
  justUnlocked?: string | undefined;
  /** Current level id + display title. */
  zone: string;
  title: string;
  /** Nearby door prompt, if any. */
  prompt?: string | undefined;
};

const PLAYER_RADIUS = 0.5;
const EYE_HEIGHT = 1.7;
const WALK = 6.0;
const SPRINT = 10.0;
const ACCEL = 42;
const FRICTION = 12;

type StartState = Pick<
  SaveData,
  "position" | "yaw" | "chapter" | "unlocked" | "weapon" | "zone"
>;

const LEVELS: Record<string, (g: THREE.DataTexture) => LevelResult> = {
  club: buildNightclub,
  city: buildCity,
};

export function createEngine(
  canvas: HTMLCanvasElement,
  start: StartState,
  onLockChange: (locked: boolean) => void,
  onLoadout: (state: LoadoutState) => void = () => {},
  options: {
    playIntro?: boolean;
    onCutscene?: (state: CutsceneState) => void;
  } = {},
): EngineHandle {
  const onCutscene = options.onCutscene ?? (() => {});
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 260);
  const gradient = makeToonGradient();

  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(55, 1, 0.01, 5);

  // --- loadout / progression state
  const unlocked = new Set(start.unlocked?.length ? start.unlocked : [WEAPONS[0]!.id]);
  unlocked.add(WEAPONS[0]!.id);
  let weapon: WeaponDef =
    WEAPONS.find((w) => w.id === start.weapon && unlocked.has(w.id)) ?? WEAPONS[0]!;

  const viewRig = new THREE.Group();
  let viewModel = buildViewModel(gradient, weapon);
  viewRig.add(viewModel);
  viewScene.add(viewRig);
  viewScene.add(new THREE.HemisphereLight(0xffe6f2, 0x3a2a5a, 1.5));
  const viewKey = new THREE.DirectionalLight(0xffffff, 2.2);
  viewKey.position.set(-1, 2, 2);
  viewScene.add(viewKey);

  // --- level state
  let zone = LEVELS[start.zone] ? start.zone : "club";
  let level: LevelResult = LEVELS[zone]!(gradient);
  scene.add(level.root);
  applyLevelAtmosphere();

  const player = new THREE.Vector3(start.position[0], EYE_HEIGHT, start.position[2]);
  const velocity = new THREE.Vector2(0, 0);
  let yaw = start.yaw;
  let pitch = 0;
  let bobTime = 0;
  let swayX = 0;
  let swayY = 0;
  let recoil = 0;
  let doorCooldown = 0;
  let prompt: string | undefined;

  // --- opening cutscene
  let cutTime = 0;
  let cutscene = options.playIntro === true && zone === "club";
  let cutLine: CutsceneLine | null = null;
  viewRig.visible = !cutscene;
  if (cutscene) onCutscene({ active: true, progress: 0, line: null });

  function endCutscene() {
    if (!cutscene) return;
    cutscene = false;
    cutLine = null;
    viewRig.visible = true;
    const last = CLUB_INTRO.keys[CLUB_INTRO.keys.length - 1]!;
    player.set(last.pos[0], EYE_HEIGHT, last.pos[2]);
    yaw = last.yaw;
    pitch = 0;
    velocity.set(0, 0);
    onCutscene({ active: false, progress: 1, line: null });
  }


  const emitLoadout = (justUnlocked?: string) =>
    onLoadout({
      unlocked: [...unlocked],
      weapon: weapon.id,
      justUnlocked,
      zone,
      title: level.title,
      prompt,
    });
  emitLoadout();

  function applyLevelAtmosphere() {
    scene.background = new THREE.Color(level.background);
    scene.fog = new THREE.Fog(level.fog.color, level.fog.near, level.fog.far);
  }

  function disposeLevel(l: LevelResult) {
    l.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    scene.remove(l.root);
  }

  function travel(to: string, spawn: [number, number], newYaw: number) {
    const build = LEVELS[to];
    if (!build) return;
    disposeLevel(level);
    zone = to;
    level = build(gradient);
    scene.add(level.root);
    applyLevelAtmosphere();
    player.set(spawn[0], EYE_HEIGHT, spawn[1]);
    velocity.set(0, 0);
    yaw = newYaw;
    doorCooldown = 1.2;
    persist();
    emitLoadout();
  }

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

  const keys = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
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
    recoil = 1;
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
    for (const b of level.colliders as Box[]) {
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
    next.x = Math.max(-level.bounds.x, Math.min(level.bounds.x, next.x));
    next.z = Math.max(-level.bounds.z, Math.min(level.bounds.z, next.z));
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

    if (cutscene) {
      cutTime += dt;
      const k = sampleCutscene(CLUB_INTRO, cutTime);
      player.set(k.pos[0], k.pos[1], k.pos[2]);
      const drift = Math.sin(cutTime * 0.9) * 0.012;
      camera.position.set(k.pos[0], k.pos[1] + drift, k.pos[2]);
      camera.rotation.set(k.pitch + drift * 0.4, k.yaw, Math.sin(cutTime * 0.6) * 0.02, "YXZ");
      yaw = k.yaw;
      const nextLine = lineAt(CLUB_INTRO, cutTime);
      if (nextLine !== cutLine) {
        cutLine = nextLine;
        onCutscene({
          active: true,
          progress: Math.min(cutTime / CLUB_INTRO.duration, 1),
          line: cutLine,
        });
      }
      if (cutTime >= CLUB_INTRO.duration) endCutscene();
    }

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    wish.set(0, 0);
    if (cutscene) keys.clear();
    if (keys.has("KeyW") || keys.has("ArrowUp")) wish.x += fx, (wish.y += fz);
    if (keys.has("KeyS") || keys.has("ArrowDown")) wish.x -= fx, (wish.y -= fz);
    if (keys.has("KeyD") || keys.has("ArrowRight")) wish.x += -fz, (wish.y += fx);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) wish.x -= -fz, (wish.y -= fx);

    const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const maxSpeed = sprinting ? SPRINT : WALK;

    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(maxSpeed);
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

    const speed = velocity.length();
    bobTime += dt * speed * 1.5;
    const bobAmp = Math.min(speed / SPRINT, 1) * 0.055;
    const bobY = Math.sin(bobTime * 2) * bobAmp;
    const bobX = Math.cos(bobTime) * bobAmp * 0.6;

    if (!cutscene) {
      camera.position.set(player.x + bobX * 0.4, player.y + bobY, player.z);
      camera.rotation.set(pitch, yaw, Math.sin(bobTime) * bobAmp * 0.12, "YXZ");
    }

    swayX = THREE.MathUtils.damp(swayX, 0, 8, dt);
    swayY = THREE.MathUtils.damp(swayY, 0, 8, dt);
    recoil = THREE.MathUtils.damp(recoil, 0, 9, dt);
    viewRig.position.set(
      THREE.MathUtils.clamp(-swayX, -0.06, 0.06) + bobX * 0.5,
      THREE.MathUtils.clamp(-swayY, -0.06, 0.06) + bobY * 0.7 - recoil * 0.02,
      recoil * 0.06,
    );
    viewRig.rotation.set(-recoil * 0.18, Math.sin(bobTime) * bobAmp * 0.5, 0);

    for (const o of level.animated.spin) {
      o.rotation.y += dt * 1.4;
      o.position.y += Math.sin(now * 0.002 + o.position.x) * dt * 0.35;
    }

    // Crowd / pedestrian idle sway — subtle weight shift, feet stay planted
    for (const p of level.animated.bob) {
      const ph = (p.userData['phase'] as number) ?? 0;
      const t = now * 0.0028 + ph;
      p.position.y = Math.abs(Math.sin(t)) * 0.03;
      p.rotation.z = Math.sin(t) * 0.035;
    }


    // Weapon pickups (none in the early chapters, but the hook stays generic)
    for (let i = level.pickups.length - 1; i >= 0; i--) {
      const p = level.pickups[i]!;
      const dx = p.position.x - player.x;
      const dz = p.position.z - player.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) {
        const next = WEAPONS.find((w) => !unlocked.has(w.id));
        level.pickups.splice(i, 1);
        const spinIdx = level.animated.spin.indexOf(p);
        if (spinIdx >= 0) level.animated.spin.splice(spinIdx, 1);
        p.removeFromParent();
        if (next) {
          unlocked.add(next.id);
          equip(next, next.name);
        }
      }
    }

    // Doors between levels
    doorCooldown = Math.max(0, doorCooldown - dt);
    let nearPrompt: string | undefined;
    for (const ex of level.exits) {
      const dx = ex.x - player.x;
      const dz = ex.z - player.z;
      if (dx * dx + dz * dz < ex.r * ex.r) {
        nearPrompt = ex.label;
        if (doorCooldown === 0) {
          travel(ex.to, ex.spawn, ex.yaw);
          nearPrompt = undefined;
        }
        break;
      }
    }
    if (nearPrompt !== prompt) {
      prompt = nearPrompt;
      emitLoadout();
    }

    // Beat-synced dance floor (128 BPM)
    if (level.floorTiles.length) {
      const beat = (now * 0.002133) % 1;
      for (let i = 0; i < level.floorTiles.length; i++) {
        const t = level.floorTiles[i]!;
        const m = t.material as THREE.MeshBasicMaterial;
        const k =
          0.35 + 0.65 * Math.abs(Math.sin(beat * Math.PI + (t.userData['phase'] as number)));
        m.color.setHSL((i * 0.07 + now * 0.00008) % 1, 0.85, 0.25 + k * 0.35);
      }
    }

    for (let i = 0; i < level.animated.flicker.length; i++) {
      const l = level.animated.flicker[i]!;
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
      zone,
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
