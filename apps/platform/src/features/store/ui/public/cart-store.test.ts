import { describe, expect, it } from "vitest";

import { createStoreCartStore } from "./cart";

describe("createStoreCartStore", () => {
  it("keeps carts isolated between provider trees", () => {
    // arrange
    const firstCart = createStoreCartStore();
    const secondCart = createStoreCartStore();

    // act
    firstCart.getState().addProduct("hormone-harmony");

    // assert
    expect(firstCart.getState().productSlugs).toEqual([
      "hormone-harmony",
    ]);
    expect(secondCart.getState().productSlugs).toEqual([]);
  });
});
