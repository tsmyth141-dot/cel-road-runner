import * as THREE from "three";
import { makeBuilder, type LevelResult } from "./world";

const BOUND = 58;

/** Night-time street block outside the club: town square, shopfronts, traffic, pedestrians. */
export function buildCity(gradient: THREE.DataTexture): LevelResult {
  const { root, colliders, spin, flicker, bob, toon, glow, addBox, addPerson } =
    makeBuilder(gradient);
  const floorTiles: THREE.Mesh[] = [];
  const pickups: THREE.Object3D[] = [];

  /* ---------------- Ground + roads ---------------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), toon(0x241f33));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const roadMat = toon(0x15121f);
  for (const rot of [0, Math.PI / 2]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(12, 130), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.rotation.z = rot;
    r.position.y = 0.02;
    root.add(r);
  }
  // Kerbs + centre dashes
  for (let i = -6; i <= 6; i++) {
    addBox(0, 0.04, i * 9, 0.9, 0.02, 4, 0xffd400, { outline: 0, emissive: true });
    addBox(i * 9, 0.04, 0, 4, 0.02, 0.9, 0xffd400, { outline: 0, emissive: true });
  }
  for (const s of [-1, 1]) {
    addBox(s * 6.4, 0.16, 0, 0.8, 0.32, 130, 0x39304f, { outline: 0.03 });
    addBox(0, 0.16, s * 6.4, 130, 0.32, 0.8, 0x39304f, { outline: 0.03 });
  }
  // Zebra crossing into the square
  for (let i = 0; i < 6; i++) {
    addBox(-9 + i * 1.6, 0.05, 10, 1, 0.02, 8, 0xf2f2f2, { outline: 0, emissive: true });
  }

  /* ---------------- Town square ---------------- */
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 24), toon(0x2f2748));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(-22, 0.06, 22);
  root.add(plaza);
  // Fountain
  addBox(-22, 0.5, 22, 7, 1, 7, 0x3b3157, { collide: true, outline: 0.07 });
  addBox(-22, 1.1, 22, 6, 0.3, 6, 0x00e5ff, { outline: 0, emissive: true });
  addBox(-22, 2.1, 22, 1.2, 3, 1.2, 0x554a7a, { collide: true });
  addBox(-22, 3.8, 22, 2.4, 0.5, 2.4, 0x9fe8ff, { outline: 0.04, emissive: true });
  const fountainLight = new THREE.PointLight(0x00e5ff, 16, 18, 2);
  fountainLight.position.set(-22, 3, 22);
  root.add(fountainLight);
  flicker.push(fountainLight);
  // Benches + planters round the square
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bx = -22 + Math.cos(a) * 9;
    const bz = 22 + Math.sin(a) * 9;
    addBox(bx, 0.45, bz, 2.6, 0.3, 0.9, 0xd9772f, { rotY: -a, collide: true });
    addBox(bx, 0.9, bz - 0.35, 2.6, 0.9, 0.2, 0xb3591f, { rotY: -a });
  }

  /* ---------------- Blocks: shopfronts + towers ---------------- */
  type B = [x: number, z: number, w: number, h: number, d: number, c: number];
  const blocks: B[] = [
    [-30, -20, 20, 18, 16, 0x1f6feb],
    [-34, 2, 14, 26, 20, 0x6b3fd4],
    [26, -28, 20, 22, 16, 0xff2e7e],
    [30, 4, 16, 30, 22, 0x117a8b],
    [24, 30, 18, 16, 16, 0xffd400],
    [-2, -38, 30, 20, 14, 0x4b3a8f],
    [4, 38, 28, 15, 14, 0x27d17c],
    [-46, 34, 16, 12, 14, 0xff7a1a],
  ];
  const neon = [0xff2e7e, 0x00e5ff, 0xffd400, 0x27d17c, 0x8b5cf6, 0xff7a1a];
  blocks.forEach(([x, z, w, h, d, c], bi) => {
    addBox(x, h / 2, z, w, h, d, c, { collide: true, outline: 0.1 });
    addBox(x, h + 0.8, z, w * 0.7, 1.6, d * 0.7, 0x1c1730, {});
    // Window strips
    const rows = Math.max(2, Math.floor(h / 5));
    for (let r = 0; r < rows; r++) {
      const wy = 4 + r * 4.4;
      if (wy > h - 2) break;
      addBox(x, wy, z + d / 2 + 0.06, w * 0.72, 1.1, 0.1, 0xffe9a8, { outline: 0, emissive: true });
      addBox(x, wy, z - d / 2 - 0.06, w * 0.72, 1.1, 0.1, 0x9fe8ff, { outline: 0, emissive: true });
    }
    // Ground-floor shopfront with awning + hanging sign
    const fz = z + d / 2 + 0.4;
    addBox(x, 1.6, fz, w * 0.8, 3.2, 0.5, 0x120e22, { outline: 0.05 });
    addBox(x, 1.6, fz + 0.2, w * 0.6, 2.2, 0.3, neon[bi % neon.length]!, { outline: 0, emissive: true });
    addBox(x, 3.7, fz + 0.9, w * 0.86, 0.3, 2, bi % 2 ? 0xff2e7e : 0xffd400, { outline: 0.05 });
    const sign = addBox(x + w * 0.34, 5.4, fz + 0.6, 0.6, 2.4, 2.6, 0x120e22, { outline: 0.05 });
    void sign;
    addBox(x + w * 0.34, 5.4, fz + 0.75, 0.7, 1.8, 2, neon[(bi + 3) % neon.length]!, {
      outline: 0,
      emissive: true,
    });
    const l = new THREE.PointLight(neon[bi % neon.length]!, 16, 16, 2);
    l.position.set(x, 3, fz + 1);
    root.add(l);
    flicker.push(l);
  });

  /* ---------------- The nightclub facade (way back in) ---------------- */
  const CX = -18; // door position on the street
  addBox(-26, 9, 12, 18, 18, 16, 0x2b1b46, { collide: true, outline: 0.1 });
  addBox(CX + 0.4, 2.4, 12, 1, 4.8, 5, 0x0f0b1c, { outline: 0.06 });
  addBox(CX, 2.3, 12, 0.4, 4, 4, 0xff2e7e, { outline: 0, emissive: true });
  addBox(CX + 1.2, 6.4, 12, 2.6, 3.2, 7, 0x120e22, { outline: 0.06 });
  addBox(CX + 0.8, 6.4, 12, 2, 2.4, 6, 0x27d17c, { outline: 0, emissive: true });
  const doorLight = new THREE.PointLight(0xff2e7e, 22, 20, 2);
  doorLight.position.set(CX + 3, 4, 12);
  root.add(doorLight);
  flicker.push(doorLight);
  // Queue + bouncer outside the club
  addBox(CX + 2.6, 0.55, 9, 0.25, 1.1, 0.25, 0xffd400, { outline: 0.03 });
  addBox(CX + 2.6, 0.55, 15, 0.25, 1.1, 0.25, 0xffd400, { outline: 0.03 });
  addPerson(CX + 2.8, 12, 0x0f0b1c, 0x0f0b1c, 0xd79a72, -1.57, 1.1);
  addPerson(CX + 4.2, 9.4, 0x8b5cf6, 0x241a3d, 0xf2c49b, -1.2, 0.96);
  addPerson(CX + 4.4, 15.2, 0xffd400, 0x241a3d, 0x8d5a3b, -1.9, 1);

  /* ---------------- Street furniture ---------------- */
  const lamps: [number, number][] = [
    [8, -16], [-8, -6], [8, 14], [-8, 26], [8, 34], [-8, -30], [-14, 22], [-30, 22],
  ];
  for (const [x, z] of lamps) {
    addBox(x, 3, z, 0.3, 6, 0.3, 0x1c1730, { collide: true, outline: 0.04 });
    addBox(x + (x > 0 ? -0.7 : 0.7), 6, z, 1.6, 0.3, 0.4, 0xfff0c2, { outline: 0.04, emissive: true });
    const light = new THREE.PointLight(0xffc46b, 18, 16, 2);
    light.position.set(x, 5.6, z);
    root.add(light);
    flicker.push(light);
  }
  // Bins, hydrants, newspaper boxes
  const props: [number, number, number][] = [
    [7.2, 4, 0x27d17c], [-7.2, -12, 0xff3b30], [7.2, -24, 0x00e5ff],
    [-7.2, 30, 0xffd400], [-7.2, 8, 0x27d17c], [7.2, 22, 0xff3b30],
  ];
  for (const [x, z, c] of props) {
    addBox(x, 0.6, z, 1, 1.2, 1, c, { collide: true, outline: 0.05 });
    addBox(x, 1.25, z, 1.1, 0.16, 1.1, 0x1c1730, { outline: 0.03 });
  }

  // Parked cars along the kerb
  const cars: [number, number, number, number][] = [
    [9.5, -8, 0, 0xff2e7e],
    [9.5, 6, 0, 0x00e5ff],
    [-9.5, -2, 0, 0xffd400],
    [-9.5, 18, 0, 0x27d17c],
    [-2, 9.5, Math.PI / 2, 0x8b5cf6],
    [16, -9.5, Math.PI / 2, 0xf2f2f2],
  ];
  for (const [x, z, r, c] of cars) {
    addBox(x, 0.75, z, 2.4, 1, 5, c, { rotY: r, collide: true, outline: 0.07 });
    addBox(x, 1.6, z - 0.2 * Math.cos(r), 2.1, 0.9, 2.4, 0x1b1830, { rotY: r, outline: 0.06 });
    addBox(x, 0.55, z + 2.4 * Math.cos(r), 1.8, 0.4, 0.3, 0xfff0c2, { rotY: r, outline: 0, emissive: true });
    addBox(x, 0.55, z - 2.4 * Math.cos(r), 1.8, 0.4, 0.3, 0xff3b30, { rotY: r, outline: 0, emissive: true });
  }

  // Market stalls in the square
  for (let i = 0; i < 3; i++) {
    const sx = -34 + i * 5.5;
    addBox(sx, 0.9, 30, 4.4, 0.3, 2.6, 0xd9772f, { collide: true, outline: 0.05 });
    addBox(sx, 2.6, 30, 4.8, 0.35, 3, neon[i % neon.length]!, { outline: 0.05 });
    addBox(sx - 2, 1.5, 30, 0.2, 3, 0.2, 0x1c1730, { outline: 0.03 });
    addBox(sx + 2, 1.5, 30, 0.2, 3, 0.2, 0x1c1730, { outline: 0.03 });
    addPerson(sx, 32.4, neon[i % neon.length]!, 0x241a3d, skinAt(i), 3.14, 1);
  }

  // Pedestrians wandering the block
  const walkers: [number, number, number, number][] = [
    [3, 16, 0xff7a1a, 0.4], [-3, -6, 0x00e5ff, 2.2], [-12, 26, 0xf2f2f2, 1.1],
    [-26, 16, 0x27d17c, 5.0], [12, 12, 0x8b5cf6, 3.4], [-30, 26, 0xffd400, 0.8],
    [18, -4, 0xff2e7e, 4.2],
  ];
  walkers.forEach(([x, z, c, r], i) => addPerson(x!, z!, c!, 0x241a3d, skinAt(i), r!, 0.95 + (i % 3) * 0.04));

  /* ---------------- Skyline + sky ---------------- */
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 88 + (i % 3) * 10;
    const h = 18 + ((i * 37) % 34);
    addBox(Math.cos(a) * r, h / 2, Math.sin(a) * r, 14, h, 14, 0x140f28, { outline: 0, rotY: a });
  }

  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 4;
  skyCanvas.height = 64;
  const ctx = skyCanvas.getContext("2d")!;
  const stops = ["#0b0720", "#1b1046", "#3a1a63", "#6b2270", "#a83a72", "#d8566a"];
  for (let i = 0; i < stops.length; i++) {
    ctx.fillStyle = stops[i]!;
    ctx.fillRect(0, (i * 64) / stops.length, 4, 64 / stops.length + 1);
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.minFilter = THREE.NearestFilter;
  skyTex.magFilter = THREE.NearestFilter;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 16, 12),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.renderOrder = -1;
  root.add(sky);
  // Moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 18), glow(0xfff3d0));
  moon.position.set(-60, 62, -110);
  moon.lookAt(0, 6, 0);
  root.add(moon);

  /* ---------------- Atmosphere ---------------- */
  root.add(new THREE.HemisphereLight(0x7b5cff, 0x1a1230, 0.75));
  const key = new THREE.DirectionalLight(0xffb6e6, 1.1);
  key.position.set(-20, 30, 14);
  const rim = new THREE.DirectionalLight(0x4fc3ff, 0.8);
  rim.position.set(18, 12, -22);
  root.add(key, rim);

  void spin;

  return {
    root,
    colliders,
    animated: { spin, flicker, bob },
    bounds: { x: BOUND, z: BOUND },
    floorTiles,
    pickups,
    exits: [
      { x: CX + 2.2, z: 12, r: 2.4, to: "club", spawn: [-19, 14], yaw: -Math.PI / 2, label: "Back inside" },
    ],
    background: 0x0d0920,
    fog: { color: 0x1a1236, near: 30, far: 130 },
    title: "Canal Street",
  };
}

function skinAt(i: number) {
  return [0xf2c49b, 0xd79a72, 0x8d5a3b, 0x5c3a24][i % 4]!;
}
