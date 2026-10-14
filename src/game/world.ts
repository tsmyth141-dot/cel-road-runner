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

  /** Human-proportioned bartender, sculpted locally to keep the compact level pipeline. */
  function addBartender(x: number, z: number, rotY = 0, scale = 1) {
    const g = new THREE.Group();
    g.name = 'Bartender';
    const skin = 0xb88160;
    const shirt = 0xd2cec2;
    const cloth = 0x26292a;
    const hair = 0x302821;
    const sphere = new THREE.SphereGeometry(1, 16, 12);
    const part = (
      geometry: THREE.BufferGeometry, color: number,
      position: [number, number, number], size: [number, number, number],
      parent: THREE.Object3D = g, outline = 0.018,
    ) => {
      const wrap = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, toon(color));
      mesh.scale.set(...size);
      wrap.add(mesh);
      if (outline > 0) {
        const ink = new THREE.Mesh(geometry, OUTLINE_MAT);
        ink.scale.set(size[0] * (1 + outline), size[1] * (1 + outline), size[2] * (1 + outline));
        wrap.add(ink);
      }
      wrap.position.set(...position);
      parent.add(wrap);
      return wrap;
    };
    const profile = (points: [number, number][]) => new THREE.LatheGeometry(
      points.map(([r, y]) => new THREE.Vector2(r, y)), 12,
    );
    // Continuous tailored forms: waist, ribcage and sloped shoulders, not stacked boxes.
    const torso = profile([[0.24, 0], [0.29, 0.12], [0.3, 0.4], [0.38, 0.67], [0.39, 0.74], [0.26, 0.83], [0.13, 0.86], [0, 0.86]]);
    part(torso, shirt, [0, 1.02, 0], [1, 1, 0.63]);
    const waistcoat = profile([[0.25, 0], [0.29, 0.14], [0.31, 0.46], [0.355, 0.68], [0.3, 0.72], [0, 0.72]]);
    part(waistcoat, cloth, [0, 1.015, -0.008], [1.025, 1, 0.65]);
    // Open shirt front and collar, with quiet buttons rather than bright jewellery.
    part(boxGeo, shirt, [0, 1.69, -0.21], [0.13, 0.37, 0.018], g, 0);
    for (const side of [-1, 1]) {
      const collar = part(boxGeo, shirt, [side * 0.09, 1.845, -0.15], [0.13, 0.12, 0.028], g, 0);
      collar.rotation.z = side * 0.34;
    }
    for (const y of [1.28, 1.43, 1.58]) part(sphere, 0x74716a, [0, y, -0.224], [0.018, 0.018, 0.008], g, 0);
    // Modest waist apron follows the body, its hem ending above the knees.
    const apronGeo = profile([[0.31, 0], [0.285, 0.28], [0.25, 0.57]]);
    part(apronGeo, 0x374b46, [0, 0.52, -0.015], [1, 1, 0.72]);
    part(boxGeo, 0x293d38, [0, 0.84, -0.227], [0.25, 0.16, 0.016], g, 0);
    const trouser = profile([[0.085, 0], [0.10, 0.32], [0.125, 0.7], [0.155, 0.93], [0, 0.94]]);
    for (const side of [-1, 1]) {
      part(trouser, 0x303237, [side * 0.165, 0.12, 0], [1, 1, 1]);
      part(sphere, 0x17181b, [side * 0.165, 0.09, -0.075], [0.115, 0.09, 0.22]);
    }
    // Rounded shoulders, tapered forearms, relaxed hands and connected elbow joints.
    const upperArm = new THREE.CylinderGeometry(0.115, 0.092, 0.43, 12);
    const forearm = new THREE.CylinderGeometry(0.084, 0.06, 0.37, 12);
    let idleArm: THREE.Group | undefined;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.365, 1.76, 0);
      shoulder.rotation.z = side * 0.095;
      shoulder.rotation.x = -0.035;
      g.add(shoulder);
      part(sphere, shirt, [0, -0.04, 0], [0.127, 0.15, 0.125], shoulder);
      part(upperArm, shirt, [0, -0.23, 0], [1, 1, 1], shoulder);
      part(new THREE.CylinderGeometry(0.098, 0.098, 0.065, 12), shirt, [0, -0.42, 0], [1, 1, 1], shoulder);
      const elbow = new THREE.Group();
      elbow.position.y = -0.445;
      elbow.rotation.x = 0.18;
      shoulder.add(elbow);
      part(sphere, skin, [0, 0, 0], [0.086, 0.086, 0.08], elbow, 0);
      part(forearm, skin, [0, -0.18, 0], [1, 1, 1], elbow);
      part(sphere, skin, [0, -0.425, -0.009], [0.07, 0.11, 0.043], elbow);
      part(sphere, skin, [-side * 0.065, -0.398, -0.024], [0.025, 0.06, 0.027], elbow, 0);
      if (side === -1) idleArm = shoulder;
    }
    // Sculpt one skull: temples, cheeks, jaw and chin change continuously.
    const skull = new THREE.SphereGeometry(1, 20, 16);
    const vertices = skull.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const py = vertices.getY(i);
      const lower = Math.max(0, -py);
      vertices.setXYZ(i,
        vertices.getX(i) * (1 - lower * 0.22), py,
        vertices.getZ(i) * (1 - lower * 0.12));
    }
    skull.computeVertexNormals();
    part(new THREE.CylinderGeometry(0.105, 0.12, 0.24, 12), skin, [0, 1.965, 0], [1, 1, 1]);
    const head = new THREE.Group();
    head.position.set(0, 2.215, -0.015);
    head.rotation.x = -0.035;
    g.add(head);
    part(skull, skin, [0, 0, 0], [0.235, 0.315, 0.22], head);
    // Close-cropped hair is a fitted cap, not a second floating head.
    const hairCap = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.47);
    part(hairCap, hair, [0, 0.012, 0.015], [0.241, 0.32, 0.221], head);
    for (const side of [-1, 1]) {
      part(sphere, skin, [side * 0.235, -0.01, 0], [0.045, 0.075, 0.04], head, 0);
      part(sphere, 0x977257, [side * 0.257, -0.01, -0.012], [0.012, 0.035, 0.019], head, 0);
      // Small recessed eyes, lids and brows: no bulging whites or oversized features.
      part(sphere, 0xc5b5a0, [side * 0.086, 0.045, -0.195], [0.048, 0.019, 0.018], head, 0);
      part(sphere, 0x302923, [side * 0.086, 0.044, -0.211], [0.013, 0.014, 0.007], head, 0);
      const brow = part(sphere, hair, [side * 0.088, 0.09, -0.195], [0.055, 0.013, 0.013], head, 0);
      brow.rotation.z = side * -0.1;
    }
    part(sphere, skin, [0, 0.012, -0.217], [0.031, 0.078, 0.035], head, 0);
    part(sphere, skin, [0, -0.048, -0.242], [0.043, 0.03, 0.037], head, 0);
    part(sphere, 0x765044, [0, -0.125, -0.193], [0.07, 0.009, 0.012], head, 0);
    part(sphere, skin, [0, -0.17, -0.182], [0.10, 0.055, 0.018], head, 0);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16),
      new THREE.MeshBasicMaterial({ color: 0x08040f, transparent: true, opacity: 0.32, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    g.add(shadow);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    g.userData['phase'] = 0.7;
    g.userData['idleStyle'] = 'bartender';
    g.userData['idleHead'] = head;
    g.userData['idleArm'] = idleArm;
    g.userData['idleHeadBaseY'] = head.rotation.y;
    g.userData['idleArmBaseZ'] = idleArm?.rotation.z ?? 0;
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
    outline = 0.006,
    parent: THREE.Object3D = g,
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
    parent.add(wrap);
    return wrap;
  };

  const SKIN = 0xd9a07a;
  const SKIN_SHADE = 0xb98060;
  const SLEEVE = 0x2b2a36;
  const TAPE = palette.kind === "fists" ? palette.accent : 0xe9e4d8;

  /**
   * One connected right arm: sleeve -> forearm -> wrapped wrist -> clenched fist.
   * Every piece shares the arm's axis (forearm runs toward the camera on +Z),
   * so nothing floats or kinks, and finger outlines stay fine enough to read.
   */
  const addArm = (pos: [number, number, number], rot: [number, number, number]) => {
    const arm = new THREE.Group();
    arm.position.set(...pos);
    arm.rotation.set(...rot);
    g.add(arm);
    part(0.17, 0.16, 0.22, SLEEVE, [0, -0.005, 0.26], [0, 0, 0], 0.007, arm); // jacket sleeve
    part(0.175, 0.04, 0.035, 0x46424f, [0, -0.005, 0.15], [0, 0, 0], 0.004, arm); // sleeve cuff
    part(0.105, 0.095, 0.2, SKIN, [0, 0, 0.06], [0, 0, 0], 0.006, arm); // forearm
    part(0.112, 0.102, 0.05, TAPE, [0, 0, -0.03], [0, 0, 0], 0.004, arm); // wrist wrap
    part(0.125, 0.09, 0.09, SKIN, [0, 0.004, -0.095], [0, 0, 0], 0.006, arm); // back of hand
    for (let i = 0; i < 4; i++) {
      // Curled fingers: a row of knuckles folding down into the palm.
      part(0.029, 0.08, 0.05, i % 2 ? SKIN : SKIN_SHADE, [-0.045 + i * 0.03, -0.004, -0.162], [0, 0, 0], 0.0025, arm);
    }
    part(0.128, 0.024, 0.036, TAPE, [0, 0.03, -0.165], [0, 0, 0], 0.0025, arm); // knuckle tape
    part(0.04, 0.034, 0.08, SKIN_SHADE, [-0.058, -0.036, -0.13], [0, 0.55, 0], 0.003, arm); // thumb
    return arm;
  };

  if (palette.kind === "fists") {
    // Bare, taped brawler's fist held low and to the right, knuckles forward.
    addArm([0.02, -0.1, 0], [0.55, -0.02, 0.18]);
  } else {
    // Blocky stylised firearm gripped by the same connected arm.
    part(0.09, 0.11, 0.34, palette.body, [0, 0, -0.16]); // slide
    part(0.075, 0.09, 0.16, palette.accent, [0, -0.02, -0.34]); // muzzle block
    part(0.07, 0.16, 0.09, 0x3b2f66, [0, -0.13, -0.02], [0.25, 0, 0]); // grip
    part(0.05, 0.03, 0.1, 0xffd400, [0, 0.07, -0.2], [0, 0, 0], 0.004); // sight rail
    addArm([0, -0.16, 0.16], [0.2, 0, 0.04]);
  }

  g.position.set(0.21, -0.16, -0.5);
  g.rotation.set(-0.04, 0.14, 0.03);
  g.scale.setScalar(0.24);
  return g;
}
