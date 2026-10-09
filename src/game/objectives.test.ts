import { describe, expect, test } from "bun:test";
import { chapterObjectives } from "./objectives";

describe("chapter one objectives", () => {
  test("waking in the club starts with unfinished objectives", () => {
    expect(chapterObjectives("club", [], false).map((o) => o.complete)).toEqual([false, false, false]);
  });
  test("checking the booth completes only its objective", () => {
    expect(chapterObjectives("club", ["ch1-booth-aftershock"], false).map((o) => o.complete)).toEqual([true, false, false]);
  });
  test("leaving the club stays complete after returning", () => {
    expect(chapterObjectives("club", ["ch1-left-club"], false)[1]?.complete).toBe(true);
  });
  test("the house weapon completes the home objective", () => {
    expect(chapterObjectives("city", [], true).map((o) => o.complete)).toEqual([false, true, true]);
  });
});