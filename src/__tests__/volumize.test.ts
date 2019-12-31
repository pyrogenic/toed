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
    expect(minDiff("apple", "bear", {preA: "abbey"})).toEqual(["ap", "b"]);
    expect(minDiff("apple", "apricot", {preA: "abbey"})).toEqual(["app", "apr"]);

    expect(minDiff("ethos", "jap")).toEqual(["e", "j"]);
    expect(minDiff("japan", "kif")).toEqual(["j", "k"]);
    expect(minDiff("japan", "kif", {preA: "jap"})).toEqual(["japa", "k"]);
    expect(minDiff("ethos", "jap", {postB: "japan"})).toEqual(["e", "jap"]);
  });
  
});
