import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUseDoor, entersHomeAutomatically, PARKED_CARS } from './transitions';
import { buildHouse } from './house';
import { makeToonGradient } from './world';

test('only two scenery cars are parked beside the kerb', () => {
  assert.equal(PARKED_CARS.length, 2);
  for (const [x, , yaw] of PARKED_CARS) {
    assert.equal(Math.abs(x), 5.5);
    assert.equal(yaw, 0);
  }
});
test('doors cannot transition again while loading or cooling down', () => {
  assert.equal(canUseDoor(1, 2, 0, false), true);
  assert.equal(canUseDoor(1, 2, 0, true), false);
  assert.equal(canUseDoor(1, 2, 0.2, false), false);
  assert.equal(canUseDoor(3, 2, 0, false), false);
});
test('home is a separate empty map with a return door', () => {
  const house = buildHouse(makeToonGradient());
  assert.equal(house.pickups.length, 0);
  assert.equal(house.enemies.length, 0);
  assert.equal(house.exits[0]?.to, 'city');
});
test('walking up to home enters without pressing E, not other doors', () => {
  assert.equal(entersHomeAutomatically('city', 'home'), true);
  assert.equal(entersHomeAutomatically('city', 'club'), false);
  assert.equal(entersHomeAutomatically('home', 'city'), false);
});