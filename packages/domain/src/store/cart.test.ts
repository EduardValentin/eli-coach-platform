import { describe, expect, it } from "vitest";

import { reconcileCart } from "./index";

describe("reconcileCart", () => {
  it("keeps only available slugs in order", () => {
    // arrange
    const productSlugs = ["hormone-harmony", "sleep-reset", "gut-health"];
    const availableProductSlugs = ["gut-health", "hormone-harmony"];

    // act
    const reconciled = reconcileCart(productSlugs, availableProductSlugs);

    // assert
    expect(reconciled).toEqual(["hormone-harmony", "gut-health"]);
  });

  it("returns the same array instance when nothing is removed", () => {
    // arrange
    const productSlugs = ["hormone-harmony", "sleep-reset"];
    const availableProductSlugs = ["hormone-harmony", "sleep-reset", "gut-health"];

    // act
    const reconciled = reconcileCart(productSlugs, availableProductSlugs);

    // assert
    expect(reconciled).toBe(productSlugs);
  });
});
