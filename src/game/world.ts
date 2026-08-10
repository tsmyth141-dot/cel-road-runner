import * as THREE from "three";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/** 4-step toon ramp shared by every material (cheap, one texture). */
export function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([70, 130, 195, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: 0x0d0716,
  side: THREE.BackSide,
});

export type WorldResult = {
  root: THREE.Group;
  colliders: Box[];
  animated: { spin: THREE.Object3D[]; flicker: THREE.PointLight[] };
};

export function buildTestLevel(gradient: THREE.DataTexture): WorldResult {
  const root = new THREE.Group();
  const colliders: Box[] = [];
  const spin: THREE.Object3D[] = [];
  const flicker: THREE.PointLight[] = [];

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
  boxGeo.computeBoundingBox();

  type Opts = {
    rotY?: number;
    outline?: number;
    collide?: boolean;
    emissive?: boolean;
  };

  /** One box, optional inverted-hull outline + AABB collider. */
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
      // Rotation-aware AABB (axis-aligned envelope is fine for blocky geometry)
      const c = Math.abs(Math.cos(rotY));
      const s = Math.abs(Math.sin(rotY));
      const ew = (w * c + d * s) / 2;
      const ed = (d * c + w * s) / 2;
      colliders.push({ minX: x - ew, maxX: x + ew, minZ: z - ed, maxZ: z + ed });
    }
    return group;
  }

  /* ---------------- Ground: tiled plaza slabs ---------------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    toon(0x2a2438),
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  // Painted road cross through the plaza
  const roadMat = toon(0x1e1a2b);
  const roadA = new THREE.Mesh(new THREE.PlaneGeometry(10, 90), roadMat);
  roadA.rotation.x = -Math.PI / 2;
  roadA.position.y = 0.02;
  const roadB = roadA.clone();
  roadB.rotation.z = Math.PI / 2;
  root.add(roadA, roadB);

  // Street-art dashes down the road
  for (let i = -4; i <= 4; i++) {
    addBox(0, 0.04, i * 9, 1.1, 0.02, 4, 0xffd400, { outline: 0, emissive: true });
    addBox(i * 9, 0.04, 0, 4, 0.02, 1.1, 0xff2e7e, { outline: 0, emissive: true });
  }

  // Central spray-tag disc
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 20), toon(0x3b2f56));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  root.add(disc);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 7, 24),
    glow(0x27d17c),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  root.add(ring);

  /* ---------------- Block architecture ---------------- */
  type Building = [x: number, z: number, w: number, h: number, d: number, c: number];
  const buildings: Building[] = [
    [-24, -22, 16, 14, 14, 0x1f6feb],
    [-26, 4, 12, 20, 18, 0x6b3fd4],
    [-22, 26, 14, 11, 12, 0xff7a1a],
    [24, -26, 18, 17, 14, 0xff2e7e],
    [27, 2, 12, 23, 20, 0x117a8b],
    [22, 25, 15, 13, 13, 0xffd400],
    [0, -34, 26, 16, 12, 0x4b3a8f],
    [0, 34, 26, 12, 12, 0x27d17c],
  ];

  for (const [x, z, w, h, d, c] of buildings) {
    addBox(x, h / 2, z, w, h, d, c, { collide: true, outline: 0.09 });
    // Chunky roof cap for silhouette variety
    addBox(x, h + 0.7, z, w * 0.7, 1.4, d * 0.7, 0x241d38, { collide: false });
    // Window strips (emissive, no outline — very cheap)
    const rows = Math.max(2, Math.floor(h / 5));
    for (let r = 0; r < rows; r++) {
      const wy = 3 + r * 4.2;
      if (wy > h - 2) break;
      addBox(x, wy, z + d / 2 + 0.06, w * 0.72, 1.1, 0.1, 0xffe9a8, {
        outline: 0,
        emissive: true,
      });
      addBox(x, wy, z - d / 2 - 0.06, w * 0.72, 1.1, 0.1, 0x9fe8ff, {
        outline: 0,
        emissive: true,
      });
    }
    // Awning ledge
    addBox(x, 4.4, z + d / 2 + 0.5, w * 0.9, 0.4, 1.2, 0x241d38, {});
  }

  /* ---------------- Playable clutter ---------------- */
  // Stacked crates
  const crates: [number, number, number, number][] = [
    [-9, -11, 1.8, 0],
    [-7.4, -11.6, 1.6, 0.4],
    [-8.4, -9.6, 1.4, 0.9],
    [11, 9, 2, 0.3],
    [12.6, 10.2, 1.6, -0.5],
    [10.2, 11.4, 1.5, 0.2],
    [-13, 13, 1.9, 0.7],
  ];
  for (const [x, z, s, r] of crates) {
    addBox(x, s / 2, z, s, s, s, 0xd9772f, { rotY: r, collide: true });
    addBox(x, s / 2, z, s * 0.55, 0.12, s * 1.02, 0x241d38, { rotY: r, outline: 0 });
  }
  // Stacked second layer
  addBox(-9, 1.8 + 0.7, -11, 1.4, 1.4, 1.4, 0xffd400, { rotY: 0.5, collide: false });
  addBox(11, 2 + 0.75, 9, 1.5, 1.5, 1.5, 0xff2e7e, { rotY: -0.3 });

  // Ramp + platform (gives verticality reading without jump mechanics yet)
  const ramp = addBox(16, 1.1, -12, 8, 0.5, 6, 0x6b3fd4, { outline: 0.07 });
  ramp.rotation.z = -0.22;
  addBox(21.5, 2.2, -12, 4, 0.6, 6, 0x8b5cf6, { collide: true });

  // Barriers / jersey blocks along the road
  for (let i = 0; i < 6; i++) {
    const z = -18 + i * 7;
    addBox(6.2, 0.6, z, 1.1, 1.2, 3.4, i % 2 ? 0xf2f2f2 : 0xff3b30, {
      collide: true,
    });
    addBox(-6.2, 0.6, z + 3, 1.1, 1.2, 3.4, i % 2 ? 0xff3b30 : 0xf2f2f2, {
      collide: true,
    });
  }

  // Street lamps with warm point lights
  const lampSpots: [number, number][] = [
    [-8, -4],
    [8, 6],
    [-8, 18],
    [8, -20],
  ];
  for (const [x, z] of lampSpots) {
    addBox(x, 2.6, z, 0.3, 5.2, 0.3, 0x241d38, { collide: true, outline: 0.04 });
    addBox(x, 5.3, z, 1.4, 0.35, 0.5, 0xfff0c2, { outline: 0.04, emissive: true });
    const light = new THREE.PointLight(0xffc46b, 18, 16, 2);
    light.position.set(x, 5, z);
    root.add(light);
    flicker.push(light);
  }

  // Neon billboards on facades
  const boards: [number, number, number, number, number][] = [
    [-17.4, 9, 0, 0x00e5ff, Math.PI / 2],
    [17.6, 11, 0, 0xff2e7e, -Math.PI / 2],
    [0, 8, -27.6, 0x27d17c, 0],
  ];
  for (const [x, y, z, c, r] of boards) {
    addBox(x, y, z, 7, 4, 0.4, 0x161028, { rotY: r, outline: 0.06 });
    addBox(x, y, z, 6, 3.1, 0.5, c, { rotY: r, outline: 0, emissive: true });
    const l = new THREE.PointLight(c, 22, 20, 2);
    l.position.set(x, y, z);
    root.add(l);
    flicker.push(l);
  }

  // Floating spray-can pickups (spin animation, pure decoration for now)
  const canGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 8);
  const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.22, 8);
  const canSpots: [number, number, number][] = [
    [-4, 1.5, -6],
    [5, 1.5, 14],
    [-14, 1.5, 2],
    [14, 1.5, -3],
  ];
  const canColors = [0xff2e7e, 0x27d17c, 0xffd400, 0x00e5ff];
  canSpots.forEach(([x, y, z], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(canGeo, toon(canColors[i]!));
    const cap = new THREE.Mesh(capGeo, glow(0xfff4d6));
    cap.position.y = 0.55;
    const hull = new THREE.Mesh(canGeo, OUTLINE_MAT);
    hull.scale.set(1.18, 1.1, 1.18);
    g.add(body, cap, hull);
    g.position.set(x, y, z);
    root.add(g);
    spin.push(g);
  });

  // Distant skyline silhouettes (no outline, no light cost)
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 78 + (i % 3) * 8;
    const h = 14 + ((i * 37) % 26);
    addBox(Math.cos(a) * r, h / 2, Math.sin(a) * r, 12, h, 12, 0x181230, {
      outline: 0,
      rotY: a,
    });
  }

  /* ---------------- Atmosphere ---------------- */
  const hemi = new THREE.HemisphereLight(0xffb9e6, 0x2a1f4d, 0.9);
  const key = new THREE.DirectionalLight(0xffd9a0, 1.9);
  key.position.set(-18, 26, 12);
  const rim = new THREE.DirectionalLight(0x4fc3ff, 1.0);
  rim.position.set(16, 10, -20);
  root.add(hemi, key, rim);

  // Gradient dusk sky (single inverted sphere, unlit)
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 16, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x1a0f3d) },
        mid: { value: new THREE.Color(0x7b2d8e) },
        bot: { value: new THREE.Color(0xff7a4d) },
      },
      vertexShader: `varying float vY;
        void main(){ vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying float vY;
        void main(){
          float t = clamp(vY*0.5+0.5, 0.0, 1.0);
          // hard-stepped bands keep the cel-shaded poster feel
          float b = floor(t*6.0)/6.0;
          vec3 c = b < 0.34 ? mix(bot, mid, b/0.34) : mix(mid, top, (b-0.34)/0.66);
          gl_FragColor = vec4(c,1.0);
        }`,
    }),
  );
  root.add(sky);

  return { root, colliders, animated: { spin, flicker } };
}

/* ---------------- First-person viewmodel ---------------- */
export function buildViewModel(gradient: THREE.DataTexture): THREE.Group {
  const g = new THREE.Group();
  const toon = (c: number) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradient });
  const box = new THREE.BoxGeometry(1, 1, 1);

  const part = (
    w: number,
    h: number,
    d: number,
    color: number,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    outline = 0.012,
  ) => {
    const wrap = new THREE.Group();
    const m = new THREE.Mesh(box, toon(color));
    m.scale.set(w, h, d);
    wrap.add(m);
    if (outline > 0) {
      const o = new THREE.Mesh(box, OUTLINE_MAT);
      o.scale.set(w + outline * 2, h + outline * 2, d + outline * 2);
      wrap.add(o);
    }
    wrap.position.set(...pos);
    wrap.rotation.set(...rot);
    g.add(wrap);
    return wrap;
  };

  // Blocky stylised pistol
  part(0.09, 0.11, 0.34, 0.0 + 0x2b2440, [0, 0, -0.16]); // slide
  part(0.075, 0.09, 0.16, 0xff2e7e, [0, -0.02, -0.34]); // muzzle block
  part(0.07, 0.16, 0.09, 0x1f1a30, [0, -0.13, -0.02], [0.25, 0, 0]); // grip
  part(0.05, 0.03, 0.1, 0xffd400, [0, 0.07, -0.2], [0, 0, 0], 0.008); // sight rail

  // Gloved hand + forearm (cartoon proportions)
  part(0.13, 0.13, 0.15, 0x27d17c, [0.01, -0.15, 0.02], [0.15, 0, 0.1]); // fist
  part(0.11, 0.11, 0.3, 0xf2c49b, [0.03, -0.22, 0.2], [0.3, 0, 0.12]); // forearm
  part(0.13, 0.13, 0.08, 0x6b3fd4, [0.04, -0.25, 0.33], [0.3, 0, 0.12]); // cuff

  g.position.set(0.26, -0.24, -0.45);
  g.rotation.set(0, 0.12, 0);
  return g;
}
