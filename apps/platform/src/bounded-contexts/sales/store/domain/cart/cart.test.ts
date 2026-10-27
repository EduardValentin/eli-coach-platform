import { describe, expect, it } from "vitest";

import { Cart } from "./cart";

describe("Cart#reconcile", () => {
  it("keeps the same slugs when every product is available", () => {
    // arrange
    const cart = Cart.of(["a", "b"]);

    // act
    const reconciled = cart.reconcile(["a", "b", "c"]);

    // assert
    expect(reconciled).toBe(cart);
  });

  it("drops products that are no longer available", () => {
    // arrange
    const cart = Cart.of(["a", "b"]);

    // act
    const reconciled = cart.reconcile(["b"]);

    // assert
    expect(reconciled.slugs).toEqual(["b"]);
  });

  it("keeps only available slugs in order", () => {
    // arrange
    const cart = Cart.of(["hormone-harmony", "sleep-reset", "gut-health"]);

    // act
    const reconciled = cart.reconcile(["gut-health", "hormone-harmony"]);

    // assert
    expect(reconciled.slugs).toEqual(["hormone-harmony", "gut-health"]);
  });

  it("returns the same cart instance when nothing is removed", () => {
    // arrange
    const cart = Cart.of(["hormone-harmony", "sleep-reset"]);

    // act
    const reconciled = cart.reconcile([
      "hormone-harmony",
      "sleep-reset",
      "gut-health",
    ]);

    // assert
    expect(reconciled).toBe(cart);
  });
});
