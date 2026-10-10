import { test } from "node:test";
import { deepStrictEqual, ok } from "node:assert";
import { movementIntent } from "./controls";

test("W moves forward", () => { deepStrictEqual(movementIntent(new Set(["KeyW"]), 0), [0, -1]); });
test("S moves backward", () => { deepStrictEqual(movementIntent(new Set(["KeyS"]), 0), [0, 1]); });
test("A moves left", () => { deepStrictEqual(movementIntent(new Set(["KeyA"]), 0), [-1, -0]); });
test("D moves right", () => { deepStrictEqual(movementIntent(new Set(["KeyD"]), 0), [1, -0]); });
test("movement follows mouse-facing direction", () => {
  const [x, z] = movementIntent(new Set(["KeyW"]), Math.PI / 2);
  ok(x < -0.99 && Math.abs(z) < 0.001);
});