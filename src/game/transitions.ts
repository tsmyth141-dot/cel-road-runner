export const TRANSITION_SECONDS = 0.8;
export const PARKED_CARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [5.5, -8, 0, 0x637a7c],
  [-5.5, 30, 0, 0x865c5c],
];

export function canUseDoor(distance: number, radius: number, cooldown: number, busy: boolean) {
  return !busy && cooldown <= 0 && distance <= radius;
}