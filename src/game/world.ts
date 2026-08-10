import * as THREE from "three";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

/** 3-step toon ramp shared by all materials (cheap, no per-material textures). */
export function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([90, 160, 220, 255]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: 0x120c1c,
  side: THREE.BackSide,
});

/** Inverted-hull outline: one extra draw call per mesh, no post-processing. */
export function withOutline(mesh: THREE.Mesh, thickness = 0.045): THREE.Group {
  const group = new THREE.Group();
  const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
  const p = mesh.geometry.boundingBox ?? null;
  if (!p) mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  outline.scale.set(
    1 + (thickness * 2) / Math.max(size.x, 0.001),
    1 + (thickness * 2) / Math.max(size.y, 0.001),
    1 + (thickness * 2) / Math.max(size.z, 0.001),
  );
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  group.add(mesh, outline);
  return group;
}

export type WorldResult = { root: THREE.Group; colliders: Box[] };

export function buildTestLevel(gradient: THREE.DataTexture): WorldResult {
  const root = new THREE.Group();
  const colliders: Box[] = [];

  const toon = (color: number) =>
    new THREE.MeshToonMaterial({ color, gradientMap: gradient });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    toon(0x2f2a3d),
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  // Painted grid lines on the ground (street-art tape look)
  const grid = new THREE.GridHelper(60, 30, 0xff2e7e, 0x4a3f63);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  grid.position.y = 0.01;
  root.add(grid);

  const addWall = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, toon(color));
    mesh.position.set(0, 0, 0);
    const g = withOutline(mesh, 0.06);
    g.position.set(x, h / 2, z);
    root.add(g);
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
  };

  // Arena boundary
  const T = 1;
  addWall(0, -30, 60, 6, T, 0x1f6feb);
  addWall(0, 30, 60, 6, T, 0x1f6feb);
  addWall(-30, 0, T, 6, 60, 0x1f6feb);
  addWall(30, 0, T, 6, 60, 0x1f6feb);

  // Interior blocks
  addWall(-8, -6, 10, 4, 1.2, 0xff2e7e);
  addWall(9, -2, 1.2, 5, 12, 0xffd400);
  addWall(2, 10, 14, 3, 1.2, 0x27d17c);
  addWall(-14, 8, 1.2, 4.5, 10, 0xff7a1a);
  addWall(16, 14, 6, 3.5, 6, 0x9b5cff);

  // Lighting: flat and cheap
  const hemi = new THREE.HemisphereLight(0xfff2d8, 0x3a2f52, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(8, 14, 6);
  root.add(hemi, key);

  return { root, colliders };
}
