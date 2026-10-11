import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUB_STREET_DOOR, HOME, STREET_BLOCK_LENGTH, groundedIdleHeight } from './neighbourhood';
import { buildCity } from './city';
import { makeToonGradient } from './world';

test('home is two street blocks from the nightclub', () => {
  assert.equal(STREET_BLOCK_LENGTH, 18);
  assert.equal(HOME.z - CLUB_STREET_DOOR.z, 36);
});

test('pedestrian idle keeps feet at ground level', () => {
  assert.equal(groundedIdleHeight(), 0);
});

test('the outdoor chapter has no pickups or enemies and only one witness', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, strokeRect() {}, fillText() {} }) }),
  } });
  try {
    const level = buildCity(makeToonGradient());
    assert.equal(level.pickups.length, 0);
    assert.equal(level.enemies.length, 0);
    assert.equal(level.animated.bob.length, 1);
    assert.equal(level.animated.bob[0]?.name, 'street-witness');
    assert.equal(level.animated.bob[0]?.position.y, 0);
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});