import * as THREE from "three";
import { buildTestLevel, buildViewModel, makeToonGradient, type Box } from "./world";
import { saveGame, type SaveData } from "./save";

export type EngineHandle = {
  dispose: () => void;
  requestPointerLock: () => void;
  save: () => void;
};

const PLAYER_RADIUS = 0.5;
const EYE_HEIGHT = 1.7;
const WALK = 6.0;
const SPRINT = 10.0;
const ACCEL = 42; // ground acceleration (units/s^2)
const FRICTION = 12; // deceleration factor when input stops

export function createEngine(
  canvas: HTMLCanvasElement,
  start: Pick<SaveData, "position" | "yaw" | "chapter">,
  onLockChange: (locked: boolean) => void,
): EngineHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x3a1f52, 45, 110);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 240);

  const gradient = makeToonGradient();
  const { root, colliders, animated } = buildTestLevel(gradient);
  scene.add(root);

  // Viewmodel lives on a separate near-plane scene so it never clips walls.
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(55, 1, 0.01, 5);
  const viewModel = buildViewModel(gradient);
  const viewRig = new THREE.Group();
  viewRig.add(viewModel);
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
    // Keep the player inside the district
    next.x = Math.max(-44, Math.min(44, next.x));
    next.z = Math.max(-44, Math.min(44, next.z));
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
    for (let i = 0; i < animated.flicker.length; i++) {
      const l = animated.flicker[i]!;
      l.intensity =
        (l.userData.base ??= l.intensity) *
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
