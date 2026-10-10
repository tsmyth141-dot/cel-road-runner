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
  test("the house weapon completes the home objective", () => {
    deepStrictEqual(chapterObjectives("city", [], true).map((o) => o.complete), [true, true]);
  });
});