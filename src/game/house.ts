import * as THREE from 'three';
import { makeBuilder, type LevelResult } from './world';
import { HOME } from './neighbourhood';

/** A small, separate quiet interior; no combat or pickups. */
export function buildHouse(gradient: THREE.DataTexture): LevelResult {
  const { root, colliders, addBox, toon } = makeBuilder(gradient);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), toon(0x626461));
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  for (const x of [-6, 6]) addBox(x, 2, 0, 0.3, 4, 14, 0x858d88, { collide: true });
  for (const z of [-7, 7]) addBox(0, 2, z, 12, 4, 0.3, 0x858d88, { collide: true });
  addBox(0, 4, 0, 12, 0.2, 14, 0x4a514f, { outline: 0 });
  addBox(0, 1.45, 6.78, 1.8, 2.9, 0.12, 0x287b78, { outline: 0.015 });
  addBox(-0.6, 1.3, 6.67, 0.09, 0.12, 0.08, 0xc8b582, { outline: 0 });
  addBox(-3.8, 0.45, -2, 2.3, 0.9, 4.1, 0x4e5960, { collide: true, outline: 0.02 });
  addBox(-3.8, 0.95, -3.5, 1.8, 0.15, 0.8, 0xc0c2b5, { outline: 0.01 });
  addBox(3.8, 0.8, -3, 2.4, 1.6, 1, 0x66584e, { collide: true, outline: 0.02 });
  addBox(3.8, 1.65, -3, 2.6, 0.12, 1.2, 0x8b8071, { outline: 0.01 });
  addBox(5.8, 2.4, 0, 0.1, 1.6, 2, 0x567381, { outline: 0.01 });
  root.add(new THREE.HemisphereLight(0xc2ced0, 0x353b37, 1.2));
  const lamp = new THREE.PointLight(0xffdfad, 18, 15, 2);
  lamp.position.set(1, 3, 0); root.add(lamp);
  return {
    root, colliders, animated: { spin: [], flicker: [], bob: [] },
    bounds: { x: 5.4, z: 6.4 }, floorTiles: [], pickups: [], enemies: [],
    exits: [{ x: 0, z: 5.8, r: 2, to: 'city', spawn: [HOME.x, HOME.frontZ - 2], yaw: Math.PI, label: 'Step outside' }],
    background: 0x262c2b, fog: { color: 0x262c2b, near: 12, far: 30 }, title: 'No. 17 · Home',
  };
}