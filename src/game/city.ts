import * as THREE from "three";
import { makeBuilder, type LevelResult } from "./world";
import { CLUB_STREET_DOOR, HOME, groundedIdleHeight } from "./neighbourhood";

const BOUND = 58;

/** Night-time street block outside the club: town square, shopfronts, traffic, pedestrians. */
export function buildCity(gradient: THREE.DataTexture): LevelResult {
  const { root, colliders, spin, flicker, bob, toon, glow, addBox, addPerson } =
    makeBuilder(gradient);
  const floorTiles: THREE.Mesh[] = [];
  const pickups: THREE.Object3D[] = [];
  const enemies: LevelResult["enemies"] = [];

  /* ---------------- A connected two-block neighbourhood ---------------- */
  const pavement = toon(0x5e6268);
  const pavementTexture = new THREE.DataTexture(new Uint8Array([
    145, 148, 152, 255, 125, 130, 137, 255,
    125, 130, 137, 255, 145, 148, 152, 255,
  ]), 2, 2, THREE.RGBAFormat);
  pavementTexture.colorSpace = THREE.SRGBColorSpace;
  pavementTexture.wrapS = pavementTexture.wrapT = THREE.RepeatWrapping;
  pavementTexture.repeat.set(70, 70);
  pavementTexture.magFilter = THREE.NearestFilter;
  pavementTexture.needsUpdate = true;
  pavement.map = pavementTexture;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), pavement);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  addBox(0, -0.015, 0, 14, 0.04, 130, 0x24272e, { outline: 0 });
  for (const crossing of [0, 20, 38]) {
    addBox(0, 0.015, crossing, 130, 0.025, 6, 0x24272e, { outline: 0 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        addBox(-5.4 + i * 1.8, 0.045, crossing + side * 4.3, 1.1, 0.015, 2.3, 0xc9c9bd, { outline: 0 });
      }
    }
  }
  for (const [start, end] of [[-58, -4], [4, 16], [24, 34], [42, 58]] as [number, number][]) {
    for (const side of [-1, 1]) {
      addBox(side * 7.2, 0.06, (start + end) / 2, 0.3, 0.12, end - start, 0x90959a, { outline: 0 });
    }
  }
  for (let z = -52; z < 58; z += 6) {
    if ([0, 20, 38].some(c => Math.abs(c - z) < 4)) continue;
    addBox(0, 0.045, z, 0.16, 0.015, 2.4, 0xc9c9bd, { outline: 0 });
  }

  const neon = [0xff2e7e, 0x00e5ff, 0xffd400, 0x27d17c, 0x8b5cf6, 0xff7a1a];
  // Buildings meet the same pavement line, with street-facing windows and entrances.
  const blocks: [number, number, number, number, number, number][] = [
    [-27, -17, 20, 14, 22, 0x596c83], [-27, 29, 20, 11, 12, 0x895e61],
    [24, 9, 18, 16, 16, 0x5b7977], [24, 29, 18, 12, 12, 0x707381],
    [24, 49, 18, 9, 14, 0x7e7168], [-43, 49, 12, 10, 14, 0x686b78],
    [24, -21, 18, 18, 28, 0x596c83],
  ];
  blocks.forEach(([x, z, w, h, d, c], bi) => {
    addBox(x, h / 2, z, w, h, d, c, { collide: true, outline: 0.045 });
    addBox(x, h + 0.18, z, w + 0.5, 0.35, d + 0.5, 0x393b46, { outline: 0.025 });
    const faceX = x + (x < 0 ? w / 2 + 0.06 : -w / 2 - 0.06);
    for (let row = 0; row < Math.floor(h / 3.2); row++) {
      for (let column = 0; column < Math.floor(d / 3.5); column++) {
        const wz = z - d / 2 + 2 + column * 3.5;
        addBox(faceX, 2 + row * 3.2, wz, 0.14, 1.5, 1.6, 0x282e37, { outline: 0.015 });
        addBox(faceX + (x < 0 ? 0.08 : -0.08), 2 + row * 3.2, wz, 0.07, 1.2, 1.3,
          (row + column + bi) % 3 === 0 ? 0xb3a381 : 0x526773, { outline: 0 });
      }
    }
    addBox(faceX, 1.45, z, 0.24, 2.9, 1.65, 0x303b44, { outline: 0.02 });
    addBox(faceX, 3.3, z, 1.2, 0.18, 3.1, 0x45444f, { outline: 0.02 });
    addBox(faceX, 0.5, z - d / 2 + 0.2, 0.15, 1, 0.3, 0xb5aaa0, { outline: 0 });
  });

  /* ---------------- Club: recessed, open metal doorway ---------------- */
  const CX = CLUB_STREET_DOOR.x;
  addBox(-26, 9, 12, 18, 18, 16, 0x51415b, { outline: 0.045 });
  // Collision is split around the passage, not a solid box behind a painted door.
  colliders.push({ minX: -35, maxX: -17, minZ: 4, maxZ: 10.2 });
  colliders.push({ minX: -35, maxX: -17, minZ: 13.8, maxZ: 20 });
  colliders.push({ minX: -35, maxX: -20, minZ: 10.2, maxZ: 13.8 });
  // Hide the solid facade at ground level with an actual shell instead.
  const clubMass = root.children[root.children.length - 1];
  if (clubMass) root.remove(clubMass);
  addBox(-26, 11.5, 12, 18, 13, 16, 0x51415b, { outline: 0.045 });
  addBox(-26, 2.5, 7.1, 18, 5, 6.2, 0x51415b, { outline: 0.035 });
  addBox(-26, 2.5, 16.9, 18, 5, 6.2, 0x51415b, { outline: 0.035 });
  addBox(-20, 2.4, 12, 0.15, 4.8, 3.6, 0x13151e, { outline: 0 });
  for (const z of [10.2, 13.8]) addBox(CX + 0.08, 2.35, z, 0.25, 4.7, 0.22, 0x9ca8a5, { outline: 0.02 });
  addBox(CX + 0.08, 4.7, 12, 0.25, 0.22, 3.8, 0x9ca8a5, { outline: 0.02 });
  addBox(-15.5, 2.2, 13.72, 3, 4.4, 0.15, 0x31584a, { outline: 0.02 });
  addBox(-15.3, 2.1, 13.59, 2.1, 0.09, 0.08, 0xb1bdb5, { outline: 0 });
  addBox(-17, 5.5, 12, 0.15, 0.65, 5.1, 0x19251f, { outline: 0.025 });
  const clubLight = new THREE.PointLight(0x75b695, 18, 12, 2);
  clubLight.position.set(-14.8, 4, 12);
  root.add(clubLight);

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

  // Residents stand on the pavement, not in traffic or inside buildings.
  const walkers: [number, number, number, number][] = [
    [-11, 8, 0x75879b, 1.5], [11, 14, 0x8b7261, -1.5],
    [-11, 29, 0x6f8d7c, 0.4], [11, 44, 0x8f6d80, 2.2],
  ];
  walkers.forEach(([x, z, c, r], i) => {
    const person = addPerson(x, z, c, 0x282d39, skinAt(i), r, 1);
    person.position.y = groundedIdleHeight();
  });

  /* ---------------- No. 17: your own recognisable house ---------------- */
  const hx = HOME.x, hz = HOME.z;
  addBox(hx, 0.035, hz, 10, 0.07, 8, 0x786f65, { outline: 0 });
  addBox(hx, 2.6, hz + 3.8, 10, 5.2, 0.4, 0xa7aaa2, { collide: true, outline: 0.025 });
  for (const side of [-1, 1]) {
    addBox(hx + side * 4.8, 2.6, hz, 0.4, 5.2, 8, 0xa7aaa2, { collide: true, outline: 0.025 });
    addBox(hx + side * 3.1, 2.6, HOME.frontZ, 3.8, 5.2, 0.4, 0xa7aaa2, { collide: true, outline: 0.025 });
    addBox(hx + side * 3.1, 2.2, HOME.frontZ - 0.25, 2, 2.1, 0.12, 0x39484f, { outline: 0.02 });
    addBox(hx + side * 3.1, 2.2, HOME.frontZ - 0.34, 1.7, 1.85, 0.1, 0xb6aa82, { outline: 0 });
    addBox(hx + side * 3.1, 2.2, HOME.frontZ - 0.42, 0.08, 1.85, 0.08, 0xe0d9c6, { outline: 0 });
    addBox(hx + side * 3.1, 2.2, HOME.frontZ - 0.42, 1.7, 0.08, 0.08, 0xe0d9c6, { outline: 0 });
  }
  addBox(hx, 4.3, HOME.frontZ, 2.4, 1.8, 0.4, 0xa7aaa2, { outline: 0.02 });
  // Pitched roof (ridge runs along Z), unlike the flat-roof commercial neighbours.
  const roofProfile = new THREE.Shape();
  roofProfile.moveTo(-5.5, 0);
  roofProfile.lineTo(0, 2.2);
  roofProfile.lineTo(5.5, 0);
  roofProfile.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofProfile, { depth: 8.8, bevelEnabled: false }), toon(0x364a52));
  roof.position.set(hx, 5.2, hz - 4.4);
  root.add(roof);
  addBox(hx + 3, 6.3, hz + 1.5, 0.9, 2.3, 1, 0x807b73, { outline: 0.025 });
  // Teal door stands open into the room, leaving a clear entrance.
  addBox(hx - 1.03, 1.65, HOME.frontZ + 1, 0.14, 3.3, 2, 0x287b78, { outline: 0.025 });
  addBox(hx - 0.92, 1.5, HOME.frontZ + 1.6, 0.08, 0.12, 0.18, 0xd0b574, { outline: 0 });
  addBox(hx, 3.55, HOME.frontZ - 0.7, 3.3, 0.18, 1.8, 0x36565c, { outline: 0.025 });
  addBox(hx - 1.6, 2.75, HOME.frontZ - 0.4, 0.3, 0.4, 0.3, 0xffd899, { outline: 0.015, emissive: true });
  const porch = new THREE.PointLight(0xffd899, 14, 10, 2);
  porch.position.set(hx, 2.8, HOME.frontZ - 0.8);
  root.add(porch);
  // Local canvas lettering stays sharp and needs no downloaded font or asset.
  function sign(text: string, x: number, y: number, z: number, width: number, yaw = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#192d30'; context.fillRect(0, 0, 512, 128);
    context.strokeStyle = '#abbcae'; context.lineWidth = 8; context.strokeRect(8, 8, 496, 112);
    context.fillStyle = '#e8e7d6'; context.font = 'bold 52px sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; root.add(mesh);
  }
  sign('17 · HOME', hx + 1.85, 3.4, HOME.frontZ - 0.24, 2.3, Math.PI);
  sign('THE VELVET CAN', -16.8, 5.5, 12, 4.8, Math.PI / 2);
  sign('CANAL STREET', -10, 3, 18.06, 2.15);
  // Low boundary walls flank the path without blocking it.
  for (const side of [-1, 1]) addBox(hx + side * 3.8, 0.4, 42.3, 5.2, 0.8, 0.3, 0x898e87, { collide: true, outline: 0.02 });
  addBox(hx, 0.04, 43, 2.4, 0.05, 3, 0xa6a49a, { outline: 0 });
  addBox(hx - 3.6, 0.8, hz + 2.5, 1.6, 1.6, 0.6, 0x776f64, { collide: true, outline: 0.025 });
  addBox(hx + 3.1, 0.7, hz + 2.8, 2, 1.4, 0.7, 0x696c70, { collide: true, outline: 0.025 });

  const gunPickup = new THREE.Group();
  gunPickup.position.set(HOME.x, 0.95, HOME.z + 1);
  gunPickup.userData["pickupKind"] = "weapon";
  gunPickup.userData["weaponId"] = "tagger";
  gunPickup.userData["label"] = "Tagger .45";
  addBox(0, 0, 0, 0.35, 0.28, 1.1, 0x5b4bd6, { parent: gunPickup, outline: 0.06 });
  addBox(0, -0.32, 0.25, 0.28, 0.55, 0.3, 0xff2e7e, { parent: gunPickup, outline: 0.05 });
  addBox(0, 0.18, -0.48, 0.24, 0.18, 0.22, 0xffd400, { parent: gunPickup, outline: 0.03, emissive: true });
  root.add(gunPickup);
  pickups.push(gunPickup);
  spin.push(gunPickup);

  // Health cans reward exploring the square and bus shelter.
  for (const [x, z] of [[-15, -18], [-29, 25]] as [number, number][]) {
    const can = new THREE.Group();
    can.position.set(x, 0.8, z);
    can.userData["pickupKind"] = "health";
    can.userData["label"] = "Fizz Can";
    addBox(0, 0, 0, 0.42, 0.85, 0.42, 0x27d17c, { parent: can, outline: 0.05, emissive: true });
    addBox(0, 0.46, 0, 0.34, 0.08, 0.34, 0xf2f2f2, { parent: can, outline: 0.03 });
    root.add(can);
    pickups.push(can);
    spin.push(can);
  }

  // Masked street toughs: deliberately few, readable, and cheap to animate.
  const enemySpawns: [number, number, number][] = [
    [11, 29, 0xff2e7e],
    [-8, -12, 0xff7a1a],
    [15, -22, 0x8b5cf6],
    [11, -28, 0x00e5ff],
  ];
  enemySpawns.forEach(([x, z, color], i) => {
    const enemy = addPerson(x, z, color, 0x0f0b1c, skinAt(i + 1), Math.PI, 1.08);
    enemy.userData["enemy"] = true;
    enemy.traverse((part) => { part.userData["enemyRoot"] = enemy; });
    addBox(0.17, 2.08, -0.27, 0.58, 0.18, 0.08, 0x0f0b1c, { parent: enemy, outline: 0.03 });
    addBox(-0.52, 1.34, 0, 0.18, 0.9, 0.2, 0xffd400, { parent: enemy, outline: 0.04 });
    enemies.push({ root: enemy, health: 60, speed: 1.65 + i * 0.08, damage: 10, attackCooldown: 0 });
  });


  /* ---------------- Street clutter + signage ---------------- */
  // Modest street signs and drain covers instead of disconnected neon clutter.
  for (const z of [20, 38]) {
    addBox(-10, 1.6, z - 2, 0.12, 3.2, 0.12, 0x535d64, { outline: 0 });
    addBox(-10, 3, z - 2, 2.2, 0.5, 0.1, 0x325457, { outline: 0.015 });
  }
  for (const z of [8, 29, 48]) addBox(6.4, 0.045, z, 0.7, 0.015, 1.3, 0x3d4248, { outline: 0 });

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
  const ctx = skyCanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const stops = ["#0b0720", "#1b1046", "#3a1a63", "#6b2270", "#a83a72", "#d8566a"];
  for (let i = 0; i < stops.length; i++) {
    ctx.fillStyle = stops[i] ?? "#0b0720";
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
    enemies,
    exits: [
      { x: CX + 0.5, z: 12, r: 0.85, to: "club", spawn: [-19, 14], yaw: -Math.PI / 2, label: "Back inside" },
    ],
    background: 0x0d0920,
    fog: { color: 0x1a1236, near: 30, far: 130 },
    title: "Canal Street",
  };
}

function skinAt(i: number) {
  return [0xf2c49b, 0xd79a72, 0x8d5a3b, 0x5c3a24][i % 4] ?? 0xd79a72;
}
