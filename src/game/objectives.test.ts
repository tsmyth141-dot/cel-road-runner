import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { chapterObjectives } from "./objectives";

describe("chapter one objectives", () => {
  test("waking in the club starts with unfinished objectives", () => {
    deepStrictEqual(chapterObjectives("club", [], false).map((o) => o.complete), [false, false]);
  });
  test("no booth replay is required even with an old save", () => {
    deepStrictEqual(chapterObjectives("club", ["ch1-booth-aftershock"], false).map((o) => o.id), ["outside", "home"]);
  });
  test("leaving the club stays complete after returning", () => {
    strictEqual(chapterObjectives("club", ["ch1-left-club"], false)[0]?.complete, true);
  });
  test("arriving home completes the home objective without a weapon", () => {
    deepStrictEqual(chapterObjectives("city", ['ch1-home-arrived'], false).map((o) => o.complete), [true, true]);
  });
  test("an old gun unlock does not imply arrival at the new home", () => {
    strictEqual(chapterObjectives('city', [], true)[1]?.complete, false);
  });
});