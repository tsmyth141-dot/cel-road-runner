import * as THREE from "three";
import type { Box, WorldResult } from "./world";

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: 0x0d0716,
  side: THREE.BackSide,
});

export type ClubResult = WorldResult & {
  bounds: { x: number; z: number };
  /** Emissive dance-floor tiles, recoloured every beat. */
  floorTiles: THREE.Mesh[];
  /** Collectable spray cans that unlock weapons. */
  pickups: THREE.Object3D[];
};

const ROOM_X = 22; // half-width
const ROOM_Z = 16; // half-depth
const WALL_H = 9;

export function buildNightclub(gradient: THREE.DataTexture): ClubResult {
  const root = new THREE.Group();
  const colliders: Box[] = [];
  const spin: THREE.Object3D[] = [];
  const flicker: THREE.PointLight[] = [];
  const floorTiles: THREE.Mesh[] = [];
  const pickups: THREE.Object3D[] = [];

  const matCache = new Map<number, THREE.MeshToonMaterial>();
  const toon = (color: number) => {
    let m = matCache.get(color);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
      matCache.set(color, m);
    }
    return m;
  };
  const glowCache = new Map<number, THREE.MeshBasicMaterial>();
  const glow = (color: number) => {
    let m = glowCache.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      glowCache.set(color, m);
    }
    return m;
  };

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  type Opts = { rotY?: number; outline?: number; collide?: boolean; emissive?: boolean };

  function addBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    opts: Opts = {},
  ) {
    const { rotY = 0, outline = 0.05, collide = false, emissive = false } = opts;
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(boxGeo, emissive ? glow(color) : toon(color));
    mesh.scale.set(w, h, d);
    group.add(mesh);
    if (outline > 0) {
      const o = new THREE.Mesh(boxGeo, OUTLINE_MAT);
      o.scale.set(w + outline * 2, h + outline * 2, d + outline * 2);
      group.add(o);
    }
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    root.add(group);

    if (collide) {
      const c = Math.abs(Math.cos(rotY));
      const s = Math.abs(Math.sin(rotY));
      const ew = (w * c + d * s) / 2;
      const ed = (d * c + w * s) / 2;
      colliders.push({ minX: x - ew, maxX: x + ew, minZ: z - ed, maxZ: z + ed });
    }
    return group;
  }

  /* ---------------- Shell ---------------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_X * 2, ROOM_Z * 2),
    toon(0x140f24),
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_X * 2, ROOM_Z * 2),
    toon(0x0d0a18),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  root.add(ceiling);

  // Walls (thick slabs, collide)
  addBox(0, WALL_H / 2, -ROOM_Z, ROOM_X * 2, WALL_H, 1, 0x241a3d, { collide: true });
  addBox(0, WALL_H / 2, ROOM_Z, ROOM_X * 2, WALL_H, 1, 0x241a3d, { collide: true });
  addBox(-ROOM_X, WALL_H / 2, 0, 1, WALL_H, ROOM_Z * 2, 0x241a3d, { collide: true });
  addBox(ROOM_X, WALL_H / 2, 0, 1, WALL_H, ROOM_Z * 2, 0x241a3d, { collide: true });

  // Graffiti panels sprayed across the walls
  const tags: [number, number, number, number, number][] = [
    [-14, 4.6, -ROOM_Z + 0.6, 0xff2e7e, 0],
    [-2, 5.2, -ROOM_Z + 0.6, 0x27d17c, 0],
    [12, 4.4, -ROOM_Z + 0.6, 0xffd400, 0],
    [-ROOM_X + 0.6, 5, -6, 0x00e5ff, Math.PI / 2],
    [-ROOM_X + 0.6, 4.2, 6, 0xff7a1a, Math.PI / 2],
    [ROOM_X - 0.6, 4.8, 2, 0x8b5cf6, -Math.PI / 2],
  ];
  for (const [x, y, z, c, r] of tags) {
    addBox(x, y, z, 6.5, 3.4, 0.2, 0x171029, { rotY: r, outline: 0.06 });
    addBox(x, y, z, 5.4, 2.4, 0.3, c, { rotY: r, outline: 0, emissive: true });
  }

  /* ---------------- Dance floor ---------------- */
  const tileColors = [0xff2e7e, 0x00e5ff, 0xffd400, 0x27d17c, 0x8b5cf6];
  const tileGeo = new THREE.PlaneGeometry(2.4, 2.4);
  for (let ix = -3; ix <= 3; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      const m = new THREE.Mesh(
        tileGeo,
        new THREE.MeshBasicMaterial({
          color: tileColors[(ix + iz + 10) % tileColors.length]!,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(ix * 2.6, 0.03, iz * 2.6 + 2);
      m.userData['phase'] = (ix * 3 + iz * 5) * 0.7;
      root.add(m);
      floorTiles.push(m);
    }
  }

  /* ---------------- Stage + DJ booth ---------------- */
  addBox(0, 0.5, -12, 20, 1, 7, 0x2b2046, { collide: false });
  addBox(0, 1.3, -12, 4.6, 1.6, 2, 0x3a2a63, { collide: true });
  addBox(0, 2.25, -12, 4.2, 0.3, 1.8, 0x0f0b1c, {});
  addBox(-1.1, 2.5, -12, 1.4, 0.2, 1, 0xff2e7e, { outline: 0.03, emissive: true });
  addBox(1.1, 2.5, -12, 1.4, 0.2, 1, 0x00e5ff, { outline: 0.03, emissive: true });
  // Stacked speakers
  for (const sx of [-8, 8]) {
    addBox(sx, 2.1, -12.5, 3, 4.2, 2.6, 0x110d20, { collide: true, outline: 0.07 });
    addBox(sx, 3.1, -11.1, 2, 2, 0.2, 0x241a3d, { outline: 0.03 });
    addBox(sx, 1.2, -11.1, 1.4, 1.4, 0.2, 0x241a3d, { outline: 0.03 });
  }
  // Back wall LED wall behind the DJ
  addBox(0, 5.6, -15.2, 15, 5, 0.3, 0x0f0b1c, { outline: 0.06 });
  for (let i = -3; i <= 3; i++) {
    addBox(i * 2, 5.6, -15, 1.5, 4, 0.3, tileColors[(i + 5) % tileColors.length]!, {
      outline: 0,
      emissive: true,
    });
  }

  /* ---------------- Bar ---------------- */
  addBox(15, 0.65, 6, 10, 1.3, 2, 0x3a2a63, { collide: true, outline: 0.07 });
  addBox(15, 1.36, 6, 10.4, 0.16, 2.4, 0xffd400, { outline: 0.03 });
  addBox(19.5, 3, 6, 2, 6, 8, 0x171029, { collide: true });
  for (let i = 0; i < 4; i++) {
    addBox(18.6, 1.6 + i * 1.3, 6, 0.3, 0.12, 7, 0x00e5ff, { outline: 0, emissive: true });
  }
  // Bar stools
  for (let i = -2; i <= 2; i++) {
    addBox(12.4, 0.55, 6 + i * 2, 0.8, 1.1, 0.8, 0xff7a1a, { collide: true });
  }

  /* ---------------- Booths / seating ---------------- */
  for (const bz of [-4, 4, 11]) {
    addBox(-17, 0.5, bz, 6, 1, 3, 0x6b3fd4, { collide: true });
    addBox(-19.4, 1.6, bz, 1, 2.2, 3, 0x4b2f9e, { collide: true, outline: 0.05 });
    addBox(-13.6, 0.9, bz, 2.2, 0.2, 2.2, 0x241a3d, {});
  }

  /* ---------------- Rigging + lights ---------------- */
  // Disco ball
  const ball = new THREE.Group();
  const ballMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshBasicMaterial({ color: 0xe9f4ff }),
  );
  const ballHull = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 1),
    OUTLINE_MAT,
  );
  ball.add(ballMesh, ballHull);
  ball.position.set(0, 6.6, 2);
  root.add(ball);
  spin.push(ball);
  addBox(0, 8, 2, 0.12, 3, 0.12, 0x0f0b1c, { outline: 0 });

  // Truss beams
  for (const tz of [-6, 2, 10]) {
    addBox(0, 8.5, tz, ROOM_X * 2 - 2, 0.4, 0.4, 0x1b1430, { outline: 0.04 });
  }

  // Coloured wash lights (pulse via flicker list)
  const rig: [number, number, number][] = [
    [-10, 8, -6, ],
    [10, 8, -6],
    [-10, 8, 6],
    [10, 8, 6],
    [0, 8, 10],
  ].map((v) => v as [number, number, number]);
  const rigColors = [0xff2e7e, 0x00e5ff, 0x8b5cf6, 0x27d17c, 0xffd400];
  rig.forEach(([x, y, z], i) => {
    const c = rigColors[i % rigColors.length]!;
    addBox(x, y - 0.4, z, 0.9, 0.7, 0.9, 0x0f0b1c, { outline: 0.04 });
    addBox(x, y - 0.85, z, 0.7, 0.2, 0.7, c, { outline: 0, emissive: true });
    const l = new THREE.PointLight(c, 26, 22, 2);
    l.position.set(x, y - 1.2, z);
    root.add(l);
    flicker.push(l);
  });

  // Spinning spray-can pickups over the floor
  const canGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 8);
  const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.22, 8);
  const canSpots: [number, number, number][] = [
    [-6, 1.4, 8],
    [6, 1.4, 8],
    [0, 1.4, -4],
  ];
  canSpots.forEach(([x, y, z], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(canGeo, toon(tileColors[i % tileColors.length]!));
    const cap = new THREE.Mesh(capGeo, glow(0xfff4d6));
    cap.position.y = 0.55;
    const hull = new THREE.Mesh(canGeo, OUTLINE_MAT);
    hull.scale.set(1.18, 1.1, 1.18);
    g.add(body, cap, hull);
    g.position.set(x, y, z);
    root.add(g);
    spin.push(g);
    pickups.push(g);
  });

  // Exit door (to the street, for later)
  addBox(-ROOM_X + 0.7, 2.2, 14, 0.4, 4.4, 4, 0x0f0b1c, { outline: 0.05 });
  addBox(-ROOM_X + 0.9, 4.9, 14, 0.3, 0.9, 4, 0x27d17c, { outline: 0, emissive: true });

  /* ---------------- Ambience ---------------- */
  root.add(new THREE.HemisphereLight(0x8a5cff, 0x150f26, 0.5));
  const key = new THREE.DirectionalLight(0xb98cff, 0.55);
  key.position.set(-8, 14, 10);
  root.add(key);
  const haze = new THREE.PointLight(0xff5fa8, 12, 26, 2);
  haze.position.set(0, 4, -8);
  root.add(haze);
  flicker.push(haze);

  return {
    root,
    colliders,
    animated: { spin, flicker },
    bounds: { x: ROOM_X - 1, z: ROOM_Z - 1 },
    floorTiles,
    pickups,
  };
}
