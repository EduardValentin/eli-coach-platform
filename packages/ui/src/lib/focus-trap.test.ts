// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { resolveFocusTrapTarget } from "./focus-trap";

function makeElements(count: number): HTMLElement[] {
  return Array.from({ length: count }, () => document.createElement("button"));
}

describe("resolveFocusTrapTarget", () => {
  it("moves shift+tab on the first element to the last", () => {
    // arrange
    const reachable = makeElements(3);

    // act
    const target = resolveFocusTrapTarget({
      active: reachable[0]!,
      reachable,
      shiftKey: true,
    });

    // assert
    expect(target).toBe(reachable[2]);
  });

  it("moves tab on the last element to the first", () => {
    // arrange
    const reachable = makeElements(3);

    // act
    const target = resolveFocusTrapTarget({
      active: reachable[2]!,
      reachable,
      shiftKey: false,
    });

    // assert
    expect(target).toBe(reachable[0]);
  });

  it("leaves tab in the middle alone", () => {
    // arrange
    const reachable = makeElements(3);

    // act
    const target = resolveFocusTrapTarget({
      active: reachable[1]!,
      reachable,
      shiftKey: false,
    });

    // assert
    expect(target).toBeNull();
  });

  it("moves shift+tab from outside the set to the last", () => {
    // arrange
    const reachable = makeElements(3);
    const outsider = document.createElement("button");

    // act
    const target = resolveFocusTrapTarget({
      active: outsider,
      reachable,
      shiftKey: true,
    });

    // assert
    expect(target).toBe(reachable[2]);
  });
});
