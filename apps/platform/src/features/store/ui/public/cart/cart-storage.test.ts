// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STORE_CART_PERSIST_OPTIONS,
  STORE_CART_STORAGE_KEY,
} from "./cart-storage";

const storage = STORE_CART_PERSIST_OPTIONS.storage;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("store cart storage", () => {
  it("reads a persisted cart and drops repeated slugs", () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony", "hormone-harmony"],
        version: 1,
      }),
    );

    // act
    const storedCart = storage.getItem(STORE_CART_STORAGE_KEY);

    // assert
    expect(storedCart).toEqual({
      state: { productSlugs: ["hormone-harmony"] },
      version: 1,
    });
  });

  it.each([
    ["no stored cart", null],
    [
      "a cart from another version",
      JSON.stringify({ productSlugs: [], version: 2 }),
    ],
    [
      "slugs that are not an array",
      JSON.stringify({ productSlugs: "hormone-harmony", version: 1 }),
    ],
    [
      "slugs that are not strings",
      JSON.stringify({ productSlugs: [7], version: 1 }),
    ],
    ["a cart without slugs", JSON.stringify({ version: 1 })],
    ["a value that is not an object", JSON.stringify("hormone-harmony")],
  ])("reads no cart from %s", (_case, stored) => {
    // arrange
    if (stored !== null) {
      localStorage.setItem(STORE_CART_STORAGE_KEY, stored);
    }

    // act
    const storedCart = storage.getItem(STORE_CART_STORAGE_KEY);

    // assert
    expect(storedCart).toBeNull();
  });

  it("reads no cart when the stored value is not JSON", () => {
    // arrange
    localStorage.setItem(STORE_CART_STORAGE_KEY, "{not json");

    // act
    const storedCart = storage.getItem(STORE_CART_STORAGE_KEY);

    // assert
    expect(storedCart).toBeNull();
  });

  it("keeps the cart usable when the browser refuses to store it", () => {
    // arrange
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    // act
    const writeCart = () =>
      storage.setItem(STORE_CART_STORAGE_KEY, {
        state: { productSlugs: ["hormone-harmony"] },
        version: 1,
      });

    // assert
    expect(writeCart).not.toThrow();
  });
});
