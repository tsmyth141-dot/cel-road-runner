import * as THREE from "three";
import { buildViewModel, makeToonGradient, type Box, type LevelResult } from "./world";
import { buildNightclub } from "./nightclub";
import { buildCity } from "./city";
import { saveGame, type SaveData } from "./save";
import { WEAPONS, type WeaponDef } from "./progression";
import { movementIntent } from "./controls";
import {
  CLUB_INTRO,
  lineAt,
  sampleCutscene,
  type CutsceneLine,
  type CutsceneScript,
} from "./cutscene";

export type EngineHandle = {
  dispose: () => void;
  requestPointerLock: () => void;
  save: () => void;
  skipCutscene: () => void;
  closeConversation: () => void;
};

export type CutsceneState = {
  active: boolean;
  waking?: boolean;
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
  health: number;
  maxHealth: number;
  enemies: number;
  storyFlags: string[];
};

const PLAYER_RADIUS = 0.5;
const EYE_HEIGHT = 1.7;
const WALK = 6.0;
const SPRINT = 10.0;
const ACCEL = 42;
const FRICTION = 12;
const MAX_HEALTH = 100;

type StartState = Pick<
  SaveData,
  "position" | "yaw" | "chapter" | "unlocked" | "weapon" | "zone" | "storyFlags"
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
    onConversation?: (active: boolean) => void;
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
  const storyFlags = new Set(start.storyFlags ?? []);
  let bartenderInRange = false;
  let conversation = false;
  let health = MAX_HEALTH;
  let livingEnemies = level.enemies.length;
  let lastHudHealth = health;
  let lastHudEnemies = livingEnemies;
  const raycaster = new THREE.Raycaster();

  // --- opening cutscene
  let cutTime = 0;
  let cutStart = 0;
  let activeScript: CutsceneScript | null = options.playIntro === true && zone === "club" ? CLUB_INTRO : null;
  let cutscene = activeScript !== null;
  let cutLine: CutsceneLine | null = null;
  let cutsceneEnded = !cutscene;
  viewRig.visible = !cutscene;
  if (cutscene) onCutscene({ active: true, waking: true, progress: 0, line: null });

  function endCutscene() {
    if (cutsceneEnded) return;
    const finishedScript = activeScript;
    cutsceneEnded = true;
    cutscene = false;
    cutTime = finishedScript?.duration ?? cutTime;
    cutStart = 0;
    cutLine = null;
    keys.clear();
    viewRig.visible = true;
    const lastKey = finishedScript?.keys[finishedScript.keys.length - 1];
    if (lastKey) {
      player.set(lastKey.pos[0], EYE_HEIGHT, lastKey.pos[2]);
      yaw = lastKey.yaw;
    }
    pitch = 0;
    velocity.set(0, 0);
    activeScript = null;
    persist();
    emitLoadout();
    onCutscene({ active: false, progress: 1, line: null });
  }

  function closeConversation() {
    conversation = false;
    options.onConversation?.(false);
    requestPointerLock();
  }

  function requestPointerLock() {
    if (document.pointerLockElement === canvas) return;
    const request = canvas.requestPointerLock();
    request?.catch(() => {
      // Browsers may reject lock when the cutscene ends without a user gesture.
      // The pause overlay remains available as a safe manual fallback.
    });
  }

  function skipCutscene() {
    endCutscene();
    // Kept in the same click gesture as the Skip button so Chrome permits it.
    requestPointerLock();
  }


  const emitLoadout = (justUnlocked?: string) =>
    onLoadout({
      unlocked: [...unlocked],
      weapon: weapon.id,
      justUnlocked,
      zone,
      title: level.title,
      prompt,
      health,
      maxHealth: MAX_HEALTH,
      enemies: livingEnemies,
      storyFlags: [...storyFlags],
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
    if (zone === "city") storyFlags.add("ch1-left-club");
    level = build(gradient);
    livingEnemies = level.enemies.length;
    lastHudEnemies = livingEnemies;
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
    if (conversation) {
      if (e.code === "Escape") closeConversation();
      return;
    }
    if (cutscene || document.pointerLockElement !== canvas) return;
    if (e.code === "KeyE" && !e.repeat && bartenderInRange) {
      e.preventDefault();
      conversation = true;
      keys.clear();
      velocity.set(0, 0);
      options.onConversation?.(true);
      document.exitPointerLock();
      return;
    }
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
    if (cutscene || document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * 0.0021;
    pitch -= e.movementY * 0.0021;
    pitch = Math.max(-1.45, Math.min(1.45, pitch));
    swayX += e.movementX * 0.00035;
    swayY += e.movementY * 0.00035;
  };

  const onMouseDown = () => {
    if (document.pointerLockElement !== canvas) return;
    recoil = 1;
    if (cutscene) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const maxRange = weapon.kind === "gun" ? 55 : 1.8;
    raycaster.far = maxRange;
    const enemyObjects = level.enemies.filter((enemy) => enemy.health > 0).map((enemy) => enemy.root);
    const hit = raycaster.intersectObjects(enemyObjects, true)[0];
    if (!hit) return;
    let target: THREE.Object3D | null = hit.object;
    let enemyRoot: THREE.Group | undefined;
    while (target && !enemyRoot) {
      enemyRoot = target.userData["enemyRoot"] as THREE.Group | undefined;
      target = target.parent;
    }
    const enemy = level.enemies.find((candidate) => candidate.root === enemyRoot);
    if (!enemy || enemy.health <= 0) return;
    enemy.health -= weapon.kind === "gun" ? 34 : 22;
    enemy.root.scale.set(1.15, 0.88, 1.15);
    if (enemy.health <= 0) {
      enemy.root.visible = false;
      livingEnemies = Math.max(0, livingEnemies - 1);
      emitLoadout();
    }
  };

  const onLock = () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked) {
      keys.clear();
      velocity.set(0, 0);
    }
    onLockChange(locked);
  };

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
      // wall-clock driven so a slow frame rate never stretches the scene
      if (cutStart === 0) cutStart = now;
      cutTime = (now - cutStart) / 1000;
      const script = activeScript;
      if (!script) {
        endCutscene();
        return;
      }
      const k = sampleCutscene(script, cutTime);
      player.set(k.pos[0], k.pos[1], k.pos[2]);
      const waking = script === CLUB_INTRO;
      const unease = waking && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? Math.pow(Math.max(0, 1 - cutTime / 13), 2)
        : 0;
      const drift = Math.sin(cutTime * 0.9) * (0.012 + unease * 0.035);
      camera.position.set(k.pos[0], k.pos[1] + drift, k.pos[2]);
      camera.rotation.set(k.pitch + drift * 0.4, k.yaw + Math.sin(cutTime * 0.7) * unease * 0.025,
        Math.sin(cutTime * 0.6) * (0.008 + unease * 0.045), "YXZ");
      yaw = k.yaw;
      const nextLine = lineAt(script, cutTime);
      if (nextLine !== cutLine) {
        cutLine = nextLine;
        onCutscene({
          active: true,
          waking,
          progress: Math.min(cutTime / script.duration, 1),
          line: cutLine,
        });
      }
      if (cutTime >= script.duration) endCutscene();
    }

    if (cutscene || conversation) keys.clear();
    const [moveX, moveZ] = movementIntent(keys, yaw);
    wish.set(moveX, moveZ);

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
      if (p.userData['idleStyle'] === 'bartender') {
        p.position.y = Math.sin(t * 0.48) * 0.008;
        p.rotation.z = Math.sin(t * 0.55) * 0.012;
        const head = p.userData['idleHead'];
        const arm = p.userData['idleArm'];
        if (head instanceof THREE.Object3D) {
          const baseY = (p.userData['idleHeadBaseY'] as number) ?? 0;
          head.rotation.y = baseY + Math.sin(t * 0.42) * 0.045;
        }
        if (arm instanceof THREE.Object3D) {
          const baseZ = (p.userData['idleArmBaseZ'] as number) ?? 0;
          arm.rotation.z = baseZ + Math.sin(t * 0.62) * 0.018;
        }
      } else {
        // Never lift/roll the entire person: that moves both feet off the pavement.
        p.position.y = 0;
        p.rotation.z = 0;
      }
    }

    // Lightweight chapter enemies: patrol until nearby, then close in and strike.
    if (!cutscene && zone === "city") {
      for (const enemy of level.enemies) {
        if (enemy.health <= 0 || !enemy.root.visible) continue;
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        enemy.root.scale.x = THREE.MathUtils.damp(enemy.root.scale.x, 1, 10, dt);
        enemy.root.scale.y = THREE.MathUtils.damp(enemy.root.scale.y, 1, 10, dt);
        enemy.root.scale.z = THREE.MathUtils.damp(enemy.root.scale.z, 1, 10, dt);
        const dx = player.x - enemy.root.position.x;
        const dz = player.z - enemy.root.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 15 && distance > 1.35) {
          const targetYaw = Math.atan2(dx, dz);
          const yawDiff = Math.atan2(Math.sin(targetYaw - enemy.root.rotation.y), Math.cos(targetYaw - enemy.root.rotation.y));
          enemy.root.rotation.y += THREE.MathUtils.clamp(yawDiff, -2.8 * dt, 2.8 * dt);
          const nextX = enemy.root.position.x + (dx / distance) * enemy.speed * dt;
          const nextZ = enemy.root.position.z + (dz / distance) * enemy.speed * dt;
          const blocked = level.colliders.some(b => nextX > b.minX - 0.35 && nextX < b.maxX + 0.35 && nextZ > b.minZ - 0.35 && nextZ < b.maxZ + 0.35);
          if (!blocked) enemy.root.position.set(nextX, 0, nextZ);
        } else if (distance <= 1.35 && enemy.attackCooldown === 0) {
          health = Math.max(0, health - enemy.damage);
          enemy.attackCooldown = 1.1;
          recoil = Math.max(recoil, 0.45);
        }
      }
    }


    // Chapter pickups: the first gun at home, plus simple health cans.
    for (let i = level.pickups.length - 1; i >= 0; i--) {
      const p = level.pickups[i]!;
      const dx = p.position.x - player.x;
      const dz = p.position.z - player.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) {
        const kind = p.userData["pickupKind"] as string | undefined;
        level.pickups.splice(i, 1);
        const spinIdx = level.animated.spin.indexOf(p);
        if (spinIdx >= 0) level.animated.spin.splice(spinIdx, 1);
        p.removeFromParent();
        if (kind === "weapon") {
          const weaponId = p.userData["weaponId"] as string | undefined;
          const next = WEAPONS.find((w) => w.id === weaponId);
          if (next && !unlocked.has(next.id)) {
            unlocked.add(next.id);
            storyFlags.add("ch1-first-gun");
            equip(next, next.name);
          }
        } else if (kind === "health") {
          health = Math.min(MAX_HEALTH, health + 35);
        }
      }
    }

    if (health !== lastHudHealth || livingEnemies !== lastHudEnemies) {
      lastHudHealth = health;
      lastHudEnemies = livingEnemies;
      emitLoadout();
    }

    // Doors between levels
    doorCooldown = Math.max(0, doorCooldown - dt);
    let nearPrompt: string | undefined;
    bartenderInRange = false;
    if (!cutscene && !conversation && zone === "club") {
      const dx = player.x - -10.6;
      const dz = player.z - 5.6;
      bartenderInRange = dx * dx + dz * dz < 3.6 * 3.6;
      if (bartenderInRange) nearPrompt = "E · Talk to bartender";
    }
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

    // Closing-time floor: low, slow pools of colour rather than party strobes.
    if (level.floorTiles.length) {
      const beat = (now * 0.00012) % 1;
      for (let i = 0; i < level.floorTiles.length; i++) {
        const t = level.floorTiles[i]!;
        const m = t.material as THREE.MeshBasicMaterial;
        const k =
          0.35 + 0.65 * Math.abs(Math.sin(beat * Math.PI + (t.userData['phase'] as number)));
        m.color.setHSL((i * 0.07) % 1, 0.45, 0.055 + k * 0.075);
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
      storyFlags: [...storyFlags],
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
      requestPointerLock();
    },
    save: persist,
    skipCutscene,
    closeConversation,
  };
}
