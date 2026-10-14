import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleHolstered, shouldShowWeapon } from './weapon-visibility';

test('hand and weapon can be hidden and shown again', () => {
  const hidden = toggleHolstered(false);
  assert.equal(shouldShowWeapon(hidden, false, false), false);
  assert.equal(shouldShowWeapon(toggleHolstered(hidden), false, false), true);
});
test('a holstered weapon stays hidden after a scene or conversation ends', () => {
  assert.equal(shouldShowWeapon(true, false, false), false);
  assert.equal(shouldShowWeapon(false, true, false), false);
  assert.equal(shouldShowWeapon(false, false, true), false);
});