import * as THREE from "three";
import { makeBuilder, OUTLINE_MAT, type LevelResult } from "./world";

export type ClubResult = LevelResult;

const ROOM_X = 22; // half-width
const ROOM_Z = 16; // half-depth
const WALL_H = 9;

export function buildNightclub(gradient: THREE.DataTexture): ClubResult {
  const { root, colliders, spin, flicker, bob, toon, glow, addBox, addPerson } =
    makeBuilder(gradient);
  const floorTiles: THREE.Mesh[] = [];
  const pickups: THREE.Object3D[] = [];

  /* ---------------- Shell ---------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_X * 2, ROOM_Z * 2), toon(0x2a2140));
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_X * 2, ROOM_Z * 2), toon(0x191231));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  root.add(ceiling);

  addBox(0, WALL_H / 2, -ROOM_Z, ROOM_X * 2, WALL_H, 1, 0x352a55, { collide: true });
  addBox(0, WALL_H / 2, ROOM_Z, ROOM_X * 2, WALL_H, 1, 0x352a55, { collide: true });
  addBox(-ROOM_X, WALL_H / 2, 0, 1, WALL_H, ROOM_Z * 2, 0x352a55, { collide: true });
  addBox(ROOM_X, WALL_H / 2, 0, 1, WALL_H, ROOM_Z * 2, 0x352a55, { collide: true });

  // Skirting neon strip all the way round for a bold cel outline read
  for (const [x, z, w, d] of [
    [0, -ROOM_Z + 0.6, ROOM_X * 2 - 2, 0.2],
    [0, ROOM_Z - 0.6, ROOM_X * 2 - 2, 0.2],
    [-ROOM_X + 0.6, 0, 0.2, ROOM_Z * 2 - 2],
    [ROOM_X - 0.6, 0, 0.2, ROOM_Z * 2 - 2],
  ] as [number, number, number, number][]) {
    addBox(x, 0.18, z, w, 0.16, d, 0xff2e7e, { outline: 0, emissive: true });
  }

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
    addBox(x, y - 1.5, z, 5.4, 0.18, 0.32, 0xffffff, { rotY: r, outline: 0, emissive: true });
  }

  /* ---------------- Wall dressing / architecture ---------------- */
  const tileColorsSeed = [0xff2e7e, 0x00e5ff, 0xffd400, 0x27d17c, 0x8b5cf6];

  // Ribbed pilasters down the long walls with backlit slots between them
  for (let i = -4; i <= 4; i++) {
    const px = i * 4.6;
    for (const wz of [-ROOM_Z + 0.9, ROOM_Z - 0.9]) {
      addBox(px, WALL_H / 2, wz, 0.9, WALL_H, 0.7, 0x241a3d, { outline: 0.05 });
      addBox(px, WALL_H / 2 + 0.4, wz - Math.sign(wz) * 0.42, 0.3, WALL_H - 2.4, 0.12,
        i % 2 === 0 ? 0x8b5cf6 : 0x00e5ff, { outline: 0, emissive: true });
    }
  }
  // Arched alcoves with backlight along the side walls
  for (const [ax, ar] of [[-ROOM_X + 1.1, Math.PI / 2], [ROOM_X - 1.1, -Math.PI / 2]] as const) {
    for (const az of [-10, -2, 8, 13]) {
      addBox(ax, 3.2, az, 3.6, 6, 0.5, 0x120c22, { rotY: ar, outline: 0.06 });
      addBox(ax + Math.sign(ax) * -0.2, 3.2, az, 2.6, 5, 0.3, 0x3b1d5e, { rotY: ar, outline: 0 });
      addBox(ax + Math.sign(ax) * -0.3, 6, az, 2.8, 0.18, 0.3, 0xff2e7e, {
        rotY: ar, outline: 0, emissive: true,
      });
    }
  }
  // Hanging banners high on the back wall
  for (let i = 0; i < 5; i++) {
    const bx = -16 + i * 8;
    addBox(bx, 7.4, -ROOM_Z + 1.1, 2.2, 3.2, 0.16, 0x0f0b1c, { outline: 0.05 });
    addBox(bx, 7.4, -ROOM_Z + 1.0, 1.5, 2.4, 0.2, tileColorsSeed[i % tileColorsSeed.length]!, {
      outline: 0, emissive: true,
    });
  }
  // Deep ceiling coffers so the roof reads as built, not a flat lid
  for (let i = -3; i <= 3; i++) {
    addBox(i * 6, WALL_H - 0.35, 0, 1.2, 0.7, ROOM_Z * 2 - 2, 0x120c22, { outline: 0.04 });
  }
  // Mezzanine balcony over the bar side
  addBox(17, 5.2, 0, 10, 0.5, ROOM_Z * 2 - 4, 0x241a3d, { outline: 0.06 });
  addBox(12.3, 6.1, 0, 0.4, 1.4, ROOM_Z * 2 - 4, 0x1b1430, { outline: 0.05 });
  addBox(12.3, 6.9, 0, 0.5, 0.16, ROOM_Z * 2 - 4, 0x00e5ff, { outline: 0, emissive: true });
  for (let i = -3; i <= 3; i++) {
    addBox(17, 4.6, i * 4, 0.5, 0.9, 0.5, 0x171029, { outline: 0.04 });
  }


  const tileColors = tileColorsSeed;
  const tileGeo = new THREE.PlaneGeometry(2.4, 2.4);
  for (let ix = -3; ix <= 3; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      const m = new THREE.Mesh(
        tileGeo,
        new THREE.MeshBasicMaterial({ color: tileColors[(ix + iz + 10) % tileColors.length]! }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(ix * 2.6, 0.03, iz * 2.6 + 2);
      m.userData['phase'] = (ix * 3 + iz * 5) * 0.7;
      root.add(m);
      floorTiles.push(m);
    }
  }
  // Raised lip around the floor
  for (const [x, z, w, d] of [
    [0, -3.6, 19, 0.5],
    [0, 7.6, 19, 0.5],
    [-9.2, 2, 0.5, 11.6],
    [9.2, 2, 0.5, 11.6],
  ] as [number, number, number, number][]) {
    addBox(x, 0.12, z, w, 0.24, d, 0x2b2046, { outline: 0.03 });
  }

  /* ---------------- Stage + DJ booth ---------------- */
  addBox(0, 0.5, -12, 20, 1, 7, 0x2b2046, { collide: false });
  addBox(0, 1.3, -12, 4.6, 1.6, 2, 0x3a2a63, { collide: true });
  addBox(0, 2.25, -12, 4.2, 0.3, 1.8, 0x0f0b1c, {});
  addBox(-1.1, 2.5, -12, 1.4, 0.2, 1, 0xff2e7e, { outline: 0.03, emissive: true });
  addBox(1.1, 2.5, -12, 1.4, 0.2, 1, 0x00e5ff, { outline: 0.03, emissive: true });
  // Decks left running, nobody behind them

  // Stacked speakers
  for (const sx of [-8, 8]) {
    addBox(sx, 2.1, -12.5, 3, 4.2, 2.6, 0x110d20, { collide: true, outline: 0.07 });
    addBox(sx, 3.1, -11.1, 2, 2, 0.2, 0x241a3d, { outline: 0.03 });
    addBox(sx, 1.2, -11.1, 1.4, 1.4, 0.2, 0x241a3d, { outline: 0.03 });
    addBox(sx, 4.4, -12.5, 3.2, 0.2, 2.8, 0xffd400, { outline: 0, emissive: true });
  }
  // LED wall behind the DJ
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
  // Bottles on the back shelf
  for (let i = 0; i < 14; i++) {
    addBox(18.5, 1.95 + (i % 3) * 1.3, 3 + (i % 7) * 0.9, 0.22, 0.6, 0.22,
      tileColors[i % tileColors.length]!, { outline: 0.02, emissive: true });
  }
  // Bar stools, all empty
  for (let i = -2; i <= 2; i++) {
    addBox(12.4, 0.55, 6 + i * 2, 0.8, 1.1, 0.8, 0xff7a1a, { collide: true });
  }

  /* ---------------- Booths / seating (empty) ---------------- */
  for (const bz of [-4, 4, 11]) {
    addBox(-17, 0.5, bz, 6, 1, 3, 0x6b3fd4, { collide: true });
    addBox(-19.4, 1.6, bz, 1, 2.2, 3, 0x4b2f9e, { collide: true, outline: 0.05 });
    addBox(-13.6, 0.9, bz, 2.2, 0.2, 2.2, 0x241a3d, {});
    addBox(-13.6, 1.15, bz, 0.3, 0.3, 0.3, 0x00e5ff, { outline: 0.02, emissive: true });
  }
  // Your booth: knocked-over glasses and a spilled tray
  addBox(-13.6, 1.12, 3.4, 0.22, 0.24, 0.22, 0xffd400, { outline: 0.02, emissive: true });
  addBox(-13.2, 1.05, 4.6, 0.5, 0.1, 0.3, 0xff2e7e, { outline: 0.02 });

  // The bartender, standing over you at the booth
  addPerson(-10.6, 5.6, 0xf2f2f2, 0x0f0b1c, 0xd79a72, -1.5, 1.02);

  /* ---------------- Velvet rope + VIP corner (deserted) ---------------- */
  addBox(-16, 0.9, -12, 12, 1.8, 4, 0x2b2046, { collide: true, outline: 0.06 });
  addBox(-16, 1.85, -12, 11, 0.2, 3.6, 0x8b5cf6, { outline: 0.03, emissive: true });
  for (let i = 0; i < 4; i++) {
    addBox(-10 + i * 0.02, 0.55, -9.6 + i * 1.4, 0.22, 1.1, 0.22, 0xffd400, { outline: 0.03 });
  }


  /* ---------------- Rigging + lights ---------------- */
  const ball = new THREE.Group();
  ball.add(
    new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshBasicMaterial({ color: 0xe9f4ff })),
    new THREE.Mesh(new THREE.IcosahedronGeometry(1.18, 1), OUTLINE_MAT),
  );
  ball.position.set(0, 6.6, 2);
  root.add(ball);
  spin.push(ball);
  addBox(0, 8, 2, 0.12, 3, 0.12, 0x0f0b1c, { outline: 0 });

  for (const tz of [-6, 2, 10]) {
    addBox(0, 8.5, tz, ROOM_X * 2 - 2, 0.4, 0.4, 0x1b1430, { outline: 0.04 });
  }

  const rig: [number, number, number][] = [
    [-10, 8, -6],
    [10, 8, -6],
    [-10, 8, 6],
    [10, 8, 6],
    [0, 8, 10],
  ];
  const rigColors = [0xff2e7e, 0x00e5ff, 0x8b5cf6, 0x27d17c, 0xffd400];
  rig.forEach(([x, y, z], i) => {
    const c = rigColors[i % rigColors.length]!;
    addBox(x!, y! - 0.4, z!, 0.9, 0.7, 0.9, 0x0f0b1c, { outline: 0.04 });
    addBox(x!, y! - 0.85, z!, 0.7, 0.2, 0.7, c, { outline: 0, emissive: true });
    const l = new THREE.PointLight(c, 60, 30, 2);
    l.position.set(x!, y! - 1.2, z!);
    root.add(l);
    flicker.push(l);
  });


  /* ---------------- Extra dressing: clutter, signage, rigging ---------------- */
  // Bottle shelving behind the bar
  for (let s = 0; s < 3; s++) {
    addBox(-20.4, 2.2 + s * 1.3, -12, 1.2, 0.16, 10, 0x160f2b, { outline: 0.05 });
    for (let i = 0; i < 12; i++) {
      const bz = -16.4 + i * 0.85;
      const c = [0x27d17c, 0xffd400, 0xff2e7e, 0x00e5ff][(i + s) % 4]!;
      addBox(-20.4, 2.55 + s * 1.3, bz, 0.26, 0.7, 0.26, c, { outline: 0.03, emissive: i % 3 === 0 });
    }
  }
  // Hanging pendant lamps over the booths
  for (const pz of [-6, -1, 4, 9]) {
    addBox(-17.6, 6.6, pz, 0.08, 3.6, 0.08, 0x0f0b1c, { outline: 0.02 });
    addBox(-17.6, 4.7, pz, 1.1, 0.7, 1.1, 0x241a3d, { outline: 0.05 });
    addBox(-17.6, 4.32, pz, 0.8, 0.16, 0.8, 0xffc46b, { outline: 0, emissive: true });
    const pl = new THREE.PointLight(0xffb04f, 12, 12, 2);
    pl.position.set(-17.6, 4.1, pz);
    root.add(pl);
  }
  // Cable runs and truss ties across the ceiling
  for (const cz of [-10, -3, 5, 12]) {
    addBox(0, 8.2, cz, ROOM_X * 2 - 4, 0.12, 0.12, 0x0f0b1c, { outline: 0.02 });
  }
  // Stacked crates + kegs in the corners
  const clutter: [number, number, number, number][] = [
    [-19.5, 14, 0xd9772f, 1.4], [-17.6, 14.2, 0x4b2f9e, 1.1], [-18.4, 12.4, 0x2b2046, 1.25],
    [19.4, -13.6, 0x27d17c, 1.3], [19.6, -11.4, 0xffd400, 1.05], [17.8, -13.8, 0x1f6feb, 1.2],
  ];
  for (const [x, z, c, sz] of clutter) {
    addBox(x, sz / 2, z, sz, sz, sz, c, { collide: true, outline: 0.07 });
    addBox(x, sz + 0.06, z, sz * 0.9, 0.12, sz * 0.9, 0x0f0b1c, { outline: 0.03 });
  }
  // Speaker stacks flanking the room
  for (const sx of [-8, 8]) {
    for (let i = 0; i < 3; i++) {
      addBox(sx, 0.9 + i * 1.7, 14.2, 2.2, 1.6, 1.6, 0x110d20, { collide: i === 0, outline: 0.07 });
      addBox(sx, 0.9 + i * 1.7, 13.35, 1.5, 1.1, 0.14, 0x2b2046, { outline: 0.03 });
    }
  }
  // Poster wall — tilted gig flyers
  const flyer = [0xff2e7e, 0x00e5ff, 0xffd400, 0x27d17c, 0x8b5cf6, 0xff7a1a];
  for (let i = 0; i < 8; i++) {
    const px = -12 + i * 3.4;
    addBox(px, 3.2 + (i % 3) * 0.5, ROOM_Z - 0.66, 2.1, 2.8, 0.08, 0x0f0b1c, {
      rotY: 0, outline: 0.05,
    });
    addBox(px, 3.2 + (i % 3) * 0.5, ROOM_Z - 0.74, 1.7, 2.3, 0.08, flyer[i % flyer.length]!, {
      outline: 0, emissive: true,
    });
  }
  // Litter: cups, cans and a dropped tray on the floor
  const litter: [number, number, number][] = [
    [-11.4, 6.2, 0xffd400], [-9.8, 8.4, 0x27d17c], [3.2, 12.6, 0xff2e7e],
    [7.6, -4.2, 0x00e5ff], [-4.4, -9.2, 0xff7a1a], [12.2, 9.4, 0x8b5cf6],
    [-15.2, 2.4, 0xf2f2f2], [1.4, 5.8, 0xffd400],
  ];
  for (const [x, z, c] of litter) {
    addBox(x, 0.16, z, 0.28, 0.32, 0.28, c, { outline: 0.03 });
  }
  // Scuffed floor decals near the dance floor
  for (let i = 0; i < 5; i++) {
    addBox(-6 + i * 3, 0.03, 9.5 + (i % 2) * 1.4, 2.6, 0.02, 1.4, 0x3a2c5c, {
      rotY: i * 0.4, outline: 0,
    });
  }

  /* ---------------- Exit to the street ---------------- */
  const doorX = -ROOM_X + 0.7;
  addBox(doorX, 2.2, 14, 0.5, 4.4, 4.4, 0x0f0b1c, { outline: 0.06 });
  addBox(doorX - 0.2, 2.1, 14, 0.2, 3.8, 3.6, 0x27d17c, { outline: 0, emissive: true });
  addBox(doorX + 0.3, 5.1, 14, 0.3, 1.1, 4.6, 0xffd400, { outline: 0.04, emissive: true });
  const exitGlow = new THREE.PointLight(0x27d17c, 30, 18, 2);
  exitGlow.position.set(doorX + 1.5, 3, 14);
  root.add(exitGlow);
  // Entry corridor rails
  addBox(-16.5, 1.4, 11.4, 8, 2.8, 0.4, 0x1b1430, { collide: true, outline: 0.05 });

  /* ---------------- Ambience ---------------- */
  root.add(new THREE.HemisphereLight(0x9c7bff, 0x2e2350, 1.5));
  const key = new THREE.DirectionalLight(0xd0b0ff, 1.35);
  key.position.set(-8, 14, 10);
  root.add(key);
  const haze = new THREE.PointLight(0xff5fa8, 30, 34, 2);
  haze.position.set(0, 4, -8);
  root.add(haze);
  flicker.push(haze);

  void glow;

  return {
    root,
    colliders,
    animated: { spin, flicker, bob },
    bounds: { x: ROOM_X - 1, z: ROOM_Z - 1 },
    floorTiles,
    pickups,
    enemies: [],
    exits: [
      { x: doorX + 1.6, z: 14, r: 2.2, to: "city", spawn: [-13, 6], yaw: -Math.PI / 2, label: "Step outside" },
    ],
    background: 0x120c22,
    fog: { color: 0x1a0f2e, near: 18, far: 62 },
    title: "The Velvet Can",
  };
}
