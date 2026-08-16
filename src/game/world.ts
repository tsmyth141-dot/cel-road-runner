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
};

export type Animated = {
  spin: THREE.Object3D[];
  flicker: THREE.PointLight[];
  /** Idle-bobbing props (crowd, pedestrians). */
  bob: THREE.Object3D[];
};

export type LevelResult = {
  root: THREE.Group;
  colliders: Box[];
  animated: Animated;
  bounds: { x: number; z: number };
  floorTiles: THREE.Mesh[];
  pickups: THREE.Object3D[];
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
      o.scale.set(w + 0.09, h + 0.09, d + 0.09);
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

  return { root, colliders, spin, flicker, bob, toon, glow, boxGeo, addBox, addPerson };
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
      o.scale.set(w + outline * 2, h + outline * 2, d + outline * 2);
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
