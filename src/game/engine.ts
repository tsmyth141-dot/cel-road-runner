import * as THREE from "three";
import { buildTestLevel, makeToonGradient, type Box } from "./world";
import { saveGame, type SaveData } from "./save";

export type EngineHandle = {
  dispose: () => void;
  requestPointerLock: () => void;
  save: () => void;
};

const PLAYER_RADIUS = 0.45;
const EYE_HEIGHT = 1.7;
const SPEED = 6.2;
const SPRINT = 9.5;

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
  scene.background = new THREE.Color(0x140f22);
  scene.fog = new THREE.Fog(0x140f22, 30, 70);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    120,
  );

  const gradient = makeToonGradient();
  const { root, colliders } = buildTestLevel(gradient);
  scene.add(root);

  const player = new THREE.Vector3(...start.position);
  player.y = EYE_HEIGHT;
  let yaw = start.yaw;
  let pitch = 0;

  const keys = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
  };

  const onLock = () => onLockChange(document.pointerLockElement === canvas);

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
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
  }

  const forward = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const move = new THREE.Vector3();
  let last = performance.now();
  let raf = 0;
  let autosave = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    rightVec.set(Math.cos(yaw), 0, -Math.sin(yaw));
    move.set(0, 0, 0);
    if (keys.has("KeyW")) move.add(forward);
    if (keys.has("KeyS")) move.sub(forward);
    if (keys.has("KeyD")) move.add(rightVec);
    if (keys.has("KeyA")) move.sub(rightVec);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(
        (keys.has("ShiftLeft") ? SPRINT : SPEED) * dt,
      );
      player.x += move.x;
      player.z += move.z;
      collide(player);
    }

    camera.position.copy(player);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    renderer.render(scene, camera);

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
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerlockchange", onLock);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      renderer.dispose();
    },
    requestPointerLock() {
      canvas.requestPointerLock();
    },
    save: persist,
  };
}
