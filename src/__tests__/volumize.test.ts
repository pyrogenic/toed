/// <reference types="jest"/>

import { minDiff } from "../volumize";

describe("minDiff", () => {
  test("normal", () => {
    expect(minDiff("", "")).toEqual(["", ""]);
    expect(minDiff("a", "b")).toEqual(["a", "b"]);
    expect(minDiff("apple", "bear")).toEqual(["a", "b"]);
    expect(minDiff("apple", "apricot")).toEqual(["app", "apr"]);
  });
  test("undefined", () => {
    expect(minDiff(undefined, undefined)).toEqual([undefined, undefined]);
    expect(minDiff("a", undefined)).toEqual(["a", undefined]);
    expect(minDiff("apple", undefined)).toEqual(["a", undefined]);
    expect(minDiff(undefined, "apricot")).toEqual([undefined, "a"]);
  });

  test("with preceeder", () => {
    expect(minDiff("apple", "bear", {knownPreceeder: "abbey"})).toEqual(["ap", "b"]);
    expect(minDiff("apple", "apricot", {knownPreceeder: "abbey"})).toEqual(["app", "apr"]);
  });
});
