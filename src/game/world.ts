import * as THREE from "three";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/** A door/threshold that teleports the player to another level. */
export type Exit = {
  x: number;
  z: number;
  r: number;
  to: string;
  spawn: [number, number];
  yaw: number;
  label: string;
  /** Hinge pivots that swing open (userData.openYaw) as the player approaches. */
  doors?: THREE.Object3D[];
};

export type Animated = {
  spin: THREE.Object3D[];
  flicker: THREE.PointLight[];
  /** Idle-bobbing props (crowd, pedestrians). */
  bob: THREE.Object3D[];
};

export type Enemy = {
  root: THREE.Group;
  health: number;
  speed: number;
  damage: number;
  attackCooldown: number;
};

export type LevelResult = {
  root: THREE.Group;
  colliders: Box[];
  animated: Animated;
  bounds: { x: number; z: number };
  floorTiles: THREE.Mesh[];
  pickups: THREE.Object3D[];
  enemies: Enemy[];
  exits: Exit[];
  background: number;
  fog: { color: number; near: number; far: number };
  title: string;
};

/** Kept for older imports. */
export type WorldResult = Pick<LevelResult, "root" | "colliders" | "animated">;

/** 4-step toon ramp shared by every material (cheap, one texture). */
export function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([70, 130, 195, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: 0x08040f,
  side: THREE.BackSide,
});

/** Global ink-weight multiplier — JSRF-style chunky contour lines. */
export const OUTLINE_SCALE = 2.1;
/** Nothing that asks for an outline gets a hairline one. */
export const OUTLINE_MIN = 0.06;
export const inkWeight = (o: number) => (o <= 0 ? 0 : Math.max(OUTLINE_MIN, o * OUTLINE_SCALE));


/** Shared blocky-builder toolkit used by every level module. */
export function makeBuilder(gradient: THREE.DataTexture) {
  const root = new THREE.Group();
  const colliders: Box[] = [];
  const spin: THREE.Object3D[] = [];
  const flicker: THREE.PointLight[] = [];
  const bob: THREE.Object3D[] = [];

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

  type Opts = {
    rotY?: number;
    outline?: number;
    collide?: boolean;
    emissive?: boolean;
    parent?: THREE.Object3D;
  };

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
    const { rotY = 0, outline = 0.05, collide = false, emissive = false, parent } = opts;
    const ink = inkWeight(outline);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(boxGeo, emissive ? glow(color) : toon(color));
    mesh.scale.set(w, h, d);
    group.add(mesh);
    if (ink > 0) {
      const o = new THREE.Mesh(boxGeo, OUTLINE_MAT);
      o.scale.set(w + ink * 2, h + ink * 2, d + ink * 2);
      group.add(o);
    }
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    (parent ?? root).add(group);

    if (collide) {
      const c = Math.abs(Math.cos(rotY));
      const s = Math.abs(Math.sin(rotY));
      const ew = (w * c + d * s) / 2;
      const ed = (d * c + w * s) / 2;
      colliders.push({ minX: x - ew, maxX: x + ew, minZ: z - ed, maxZ: z + ed });
    }
    return group;
  }

  /** Chunky cel-shaded person made of 6 boxes. Cheap enough to spam. */
  function addPerson(
    x: number,
    z: number,
    shirt: number,
    pants: number,
    skin: number,
    rotY = 0,
    scale = 1,
  ) {
    const g = new THREE.Group();
    const p = { parent: g, outline: 0.045 };
    const b = (
      px: number,
      py: number,
      pz: number,
      w: number,
      h: number,
      d: number,
      c: number,
    ) => {
      const m = new THREE.Mesh(boxGeo, toon(c));
      m.scale.set(w, h, d);
      const o = new THREE.Mesh(boxGeo, OUTLINE_MAT);
      o.scale.set(w + 0.16, h + 0.16, d + 0.16);
      const wrap = new THREE.Group();
      wrap.add(m, o);
      wrap.position.set(px, py, pz);
      g.add(wrap);
      return wrap;
    };
    void p;
    b(0, 0.45, 0, 0.28, 0.9, 0.28, pants); // left leg
    b(0.34, 0.45, 0, 0.28, 0.9, 0.28, pants); // right leg
    b(0.17, 1.35, 0, 0.86, 0.95, 0.44, shirt); // torso
    b(-0.4, 1.32, 0, 0.22, 0.85, 0.24, skin); // arm
    b(0.74, 1.32, 0, 0.22, 0.85, 0.24, skin); // arm
    b(0.17, 2.05, 0, 0.5, 0.5, 0.46, skin); // head
    b(0.17, 2.33, 0, 0.58, 0.16, 0.54, shirt); // cap
    g.position.set(x - 0.17 * scale, 0, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    root.add(g);
    g.userData['phase'] = Math.random() * Math.PI * 2;
    bob.push(g);
    return g;
  }

  /** Bespoke opening bartender: a compact, expressive low-poly character. */
  function addBartender(x: number, z: number, rotY = 0, scale = 1) {
    const g = new THREE.Group();
    const skin = 0xa96745;
    const skinLight = 0xcf8961;
    const shirt = 0xeee6d8;
    const vest = 0x191522;
    const apron = 0x167f78;
    const gold = 0xffc338;

    const part = (
      geometry: THREE.BufferGeometry,
      color: number,
      position: [number, number, number],
      partScale: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
      outline = 0.07,
      parent: THREE.Object3D = g,
    ) => {
      const wrap = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, toon(color));
      mesh.scale.set(...partScale);
      wrap.add(mesh);
      if (outline > 0) {
        const ink = outline * 0.85;
        const contour = new THREE.Mesh(geometry, OUTLINE_MAT);
        contour.scale.set(partScale[0] * (1 + ink), partScale[1] * (1 + ink), partScale[2] * (1 + ink));
        wrap.add(contour);
      }
      wrap.position.set(...position);
      wrap.rotation.set(...rotation);
      parent.add(wrap);
      return wrap;
    };

    const cube = boxGeo;
    const headGeo = new THREE.SphereGeometry(0.5, 10, 8);
    const roundGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 16),
      new THREE.MeshBasicMaterial({ color: 0x08040f, transparent: true, opacity: 0.48, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.012, 0);
    g.add(shadow);

    // Heavy boots, cropped trousers, and an asymmetrical planted stance.
    part(cube, 0x0d0c13, [-0.27, 0.13, -0.06], [0.32, 0.2, 0.5], [0, -0.08, 0]);
    part(cube, 0x0d0c13, [0.28, 0.13, 0.04], [0.32, 0.2, 0.5], [0, 0.12, 0]);
    part(cube, 0x262231, [-0.25, 0.63, 0], [0.34, 0.82, 0.36], [0, 0, -0.03]);
    part(cube, 0x262231, [0.25, 0.65, 0], [0.34, 0.86, 0.36], [0, 0, 0.03]);

    // Broad shirt and waistcoat create a recognisable, top-heavy silhouette.
    part(cube, shirt, [0, 1.48, 0], [1.02, 0.94, 0.46], [0, 0, 0], 0.085);
    part(cube, vest, [0, 1.5, -0.29], [0.9, 0.9, 0.12], [0, 0, -0.025], 0.045);
    part(cube, apron, [0, 0.92, -0.31], [0.82, 0.82, 0.1], [0, 0, 0.02], 0.04);
    part(cube, 0x0d4e4d, [0, 0.49, -0.3], [0.9, 0.08, 0.12], [0, 0, 0], 0.025);
    part(cube, gold, [0, 1.67, -0.37], [0.13, 0.13, 0.05], [0, 0, Math.PI / 4], 0.02);
    part(cube, gold, [0.28, 1.74, -0.37], [0.17, 0.07, 0.025], [0, 0, 0], 0.02);

    // Connected shoulder / elbow pivots keep the arms relaxed and anatomically readable.
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.57, 1.79, 0);
    leftShoulder.rotation.set(-0.12, 0, -0.16);
    g.add(leftShoulder);
    const armGeo = new THREE.CylinderGeometry(0.5, 0.42, 1, 8);
    const handGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const addArm = (shoulder: THREE.Group, bend: number) => {
      part(armGeo, shirt, [0, -0.21, 0], [0.31, 0.46, 0.31], [0, 0, 0], 0.02, shoulder);
      part(roundGeo, shirt, [0, -0.4, 0], [0.33, 0.075, 0.33], [0, 0, 0], 0.012, shoulder);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.44, 0);
      elbow.rotation.x = bend;
      shoulder.add(elbow);
      part(handGeo, skin, [0, 0, 0], [0.24, 0.24, 0.24], [0, 0, 0], 0, elbow);
      part(armGeo, skin, [0, -0.21, 0], [0.23, 0.44, 0.23], [0, 0, 0], 0.016, elbow);
      part(handGeo, skinLight, [0, -0.51, -0.025], [0.22, 0.27, 0.16], [0, 0, 0], 0.012, elbow);
      part(handGeo, skin, [0.1, -0.47, -0.035], [0.095, 0.16, 0.1], [0, 0, -0.25], 0, elbow);
    };
    addArm(leftShoulder, 0.35);

    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.57, 1.79, 0);
    rightShoulder.rotation.set(0, 0, 0.12);
    g.add(rightShoulder);
    addArm(rightShoulder, 0.12);

    // A clean, human face: rounded skull, tapered jaw and a restrained expression.
    const head = new THREE.Group();
    part(roundGeo, skin, [0, 2.0, 0], [0.25, 0.2, 0.25], [0, 0, 0], 0.025);
    head.position.set(0, 2.22, -0.02);
    head.rotation.set(-0.05, 0.02, -0.02);
    g.add(head);
    part(headGeo, skin, [0, 0, 0], [0.7, 0.84, 0.68], [0, 0, 0], 0.035, head);
    // Hair hugs the crown instead of stacking disconnected slabs over the face.
    part(headGeo, 0x18141b, [0, 0.32, 0.04], [0.73, 0.27, 0.7], [0, 0, -0.08], 0.025, head);
    part(headGeo, 0x18141b, [0.27, 0.17, 0.12], [0.22, 0.34, 0.55], [0, 0, 0.15], 0, head);
    for (const eyeX of [-0.17, 0.17]) {
      part(headGeo, 0xe7d4bb, [eyeX, 0.055, -0.314], [0.095, 0.055, 0.025], [0, 0, 0], 0, head);
      part(headGeo, 0x201720, [eyeX, 0.055, -0.336], [0.035, 0.04, 0.018], [0, 0, 0], 0, head);
      part(cube, 0x251922, [eyeX, 0.18, -0.315], [0.21, 0.035, 0.035], [0, 0, eyeX * 0.2], 0, head);
    }
    part(headGeo, skinLight, [0, -0.095, -0.32], [0.105, 0.13, 0.095], [0, 0, 0], 0, head);
    part(cube, 0x43282b, [0, -0.21, -0.30], [0.18, 0.02, 0.025], [0, 0, 0], 0, head);
    part(headGeo, skinLight, [0.38, -0.02, 0], [0.14, 0.22, 0.12], [0, 0, 0], 0, head);
    part(headGeo, skinLight, [-0.38, -0.02, 0], [0.14, 0.22, 0.12], [0, 0, 0], 0, head);

    // A short neutral towel at the belt cannot be mistaken for an arm.
    part(cube, shirt, [0.32, 0.9, -0.39], [0.16, 0.28, 0.04], [0, 0, 0], 0.02);

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    g.userData['phase'] = 0.7;
    g.userData['idleStyle'] = 'bartender';
    g.userData['idleHead'] = head;
    g.userData['idleArm'] = leftShoulder;
    g.userData['idleHeadBaseY'] = head.rotation.y;
    g.userData['idleArmBaseZ'] = leftShoulder.rotation.z;
    bob.push(g);
    root.add(g);
    return g;
  }

  /**
   * A hinged door leaf in an X-facing wall. The leaf extends from the hinge
   * along +Z (dir 1) or -Z (dir -1); the engine swings it to userData.openYaw.
   */
  function addSwingDoor(
    hingeX: number,
    hingeZ: number,
    width: number,
    height: number,
    color: number,
    dir: 1 | -1,
    openYaw: number,
    windowColor = 0x8fa3a0,
  ) {
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, 0, hingeZ);
    const mid = (dir * width) / 2;
    addBox(0, height / 2, mid, 0.12, height - 0.04, width - 0.04, color, { outline: 0.02, parent: pivot });
    // Recessed panels, a wired-glass vision window and a push bar on both faces.
    for (const side of [-1, 1]) {
      addBox(side * 0.07, height * 0.3, mid, 0.02, height * 0.36, width * 0.68, 0x1d2a2a, { outline: 0, parent: pivot });
      addBox(side * 0.07, height * 0.72, mid, 0.02, height * 0.24, width * 0.42, windowColor, { outline: 0, emissive: true, parent: pivot });
      addBox(side * 0.13, height * 0.47, mid, 0.06, 0.08, width * 0.78, 0xb6c3b6, { outline: 0, parent: pivot });
    }
    addBox(0, height * 0.47, dir * (width - 0.12), 0.16, 0.16, 0.08, 0x8d978f, { outline: 0, parent: pivot });
    pivot.userData['openYaw'] = openYaw;
    pivot.userData['open'] = 0;
    root.add(pivot);
    return pivot;
  }

  return { root, colliders, spin, flicker, bob, toon, glow, boxGeo, addBox, addPerson, addBartender, addSwingDoor };
}

/* ---------------- First-person viewmodel ---------------- */
export function buildViewModel(
  gradient: THREE.DataTexture,
  palette: { body: number; accent: number; kind?: "fists" | "gun" } = {
    body: 0x5b4bd6,
    accent: 0xff2e7e,
  },
): THREE.Group {
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
      const ink = outline * 2.2;
      o.scale.set(w + ink * 2, h + ink * 2, d + ink * 2);
      wrap.add(o);
    }
    wrap.position.set(...pos);
    wrap.rotation.set(...rot);
    g.add(wrap);
    return wrap;
  };

  if (palette.kind === "fists") {
    // Bare hands: taped-up brawler fists, no weapon yet.
    part(0.14, 0.13, 0.16, palette.body, [0, -0.06, -0.18], [0.18, 0, 0.08]); // fist
    part(0.145, 0.035, 0.05, palette.accent, [0, 0.0, -0.24], [0.18, 0, 0.08]); // knuckle tape
    part(0.145, 0.035, 0.05, palette.accent, [0, -0.06, -0.24], [0.18, 0, 0.08]); // knuckle tape
    part(0.11, 0.11, 0.26, 0xf2c49b, [0.03, -0.15, 0.02], [0.3, 0, 0.12]); // forearm
    part(0.13, 0.13, 0.08, 0x6b3fd4, [0.04, -0.2, 0.14], [0.3, 0, 0.12]); // cuff
  } else {
    // Blocky stylised firearm
    part(0.09, 0.11, 0.34, palette.body, [0, 0, -0.16]); // slide
    part(0.075, 0.09, 0.16, palette.accent, [0, -0.02, -0.34]); // muzzle block
    part(0.07, 0.16, 0.09, 0x3b2f66, [0, -0.13, -0.02], [0.25, 0, 0]); // grip
    part(0.05, 0.03, 0.1, 0xffd400, [0, 0.07, -0.2], [0, 0, 0], 0.008); // sight rail
    part(0.13, 0.13, 0.15, 0x27d17c, [0.01, -0.15, 0.02], [0.15, 0, 0.1]); // fist
    part(0.11, 0.11, 0.3, 0xf2c49b, [0.03, -0.22, 0.2], [0.3, 0, 0.12]); // forearm
    part(0.13, 0.13, 0.08, 0x6b3fd4, [0.04, -0.25, 0.33], [0.3, 0, 0.12]); // cuff
  }

  g.position.set(0.21, -0.16, -0.5);
  g.rotation.set(-0.04, 0.14, 0.03);
  g.scale.setScalar(0.24);
  return g;
}
