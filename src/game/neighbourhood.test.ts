import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUB_STREET_DOOR, HOME, STREET_BLOCK_LENGTH, groundedIdleHeight } from './neighbourhood';

test('home is two street blocks from the nightclub', () => {
  assert.equal(STREET_BLOCK_LENGTH, 18);
  assert.equal(HOME.z - CLUB_STREET_DOOR.z, 36);
});

test('pedestrian idle keeps feet at ground level', () => {
  assert.equal(groundedIdleHeight(), 0);
});