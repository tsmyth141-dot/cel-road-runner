/** Traditional first-person WASD, relative to the camera's horizontal facing. */
export function movementIntent(keys: ReadonlySet<string>, yaw: number): [number, number] {
  const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const right = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  return [forward * -Math.sin(yaw) + right * Math.cos(yaw), forward * -Math.cos(yaw) - right * Math.sin(yaw)];
}