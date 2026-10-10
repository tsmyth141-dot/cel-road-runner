/** World-space landmarks: one unit is roughly a metre. */
export const STREET_BLOCK_LENGTH = 18;
export const CLUB_STREET_DOOR = { x: -17, z: 12 };
export const CLUB_STREET_SPAWN: [number, number] = [-13, 12];
export const HOME = { x: -23, z: CLUB_STREET_DOOR.z + STREET_BLOCK_LENGTH * 2, frontZ: 44 };
export const HOME_APPROACH: [number, number][] = [[-13, 12], [-12, 20], [-12, 38], [-12, 42], [-23, 42], [-23, 48]];
export const CLUB_INNER_DOOR = { x: -20.7, z: 14 };

export function groundedIdleHeight() { return 0; }