// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, type PropsWithChildren } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  STORE_CART_STORAGE_KEY,
  StoreCartProvider,
  useStoreCart,
} from "./store-cart";

function wrapper({ children }: PropsWithChildren) {
  return <StoreCartProvider>{children}</StoreCartProvider>;
}

function strictModeWrapper({ children }: PropsWithChildren) {
  return (
    <StrictMode>
      <StoreCartProvider>{children}</StoreCartProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StoreCartProvider", () => {
  it("persists unique product identifiers without catalog or personal data", () => {
    // arrange
    const { result } = renderHook(useStoreCart, { wrapper });

    // act
    act(() => {
      result.current.addProduct("hormone-harmony");
      result.current.addProduct("hormone-harmony");
      result.current.addProduct("nutrition-foundations");
    });

    // assert
    expect(result.current.productSlugs).toEqual([
      "hormone-harmony",
      "nutrition-foundations",
    ]);
    expect(JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!)).toEqual({
      productSlugs: ["hormone-harmony", "nutrition-foundations"],
      version: 1,
    });
  });

  it("restores persisted identifiers and prunes products missing from the live catalog", () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony", "removed-guide"],
        version: 1,
      }),
    );
    const { result } = renderHook(useStoreCart, { wrapper });

    // act
    act(() => {
      result.current.reconcileProducts(["hormone-harmony"]);
    });

    // assert
    expect(result.current.productSlugs).toEqual(["hormone-harmony"]);
  });

  it("preserves persisted identifiers during StrictMode effect replay", () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony"],
        version: 1,
      }),
    );
    const persist = vi.spyOn(localStorage, "setItem");

    // act
    const { result } = renderHook(useStoreCart, {
      wrapper: strictModeWrapper,
    });

    // assert
    expect(result.current.productSlugs).toEqual(["hormone-harmony"]);
    expect(JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!)).toEqual({
      productSlugs: ["hormone-harmony"],
      version: 1,
    });
    expect(persist).not.toHaveBeenCalledWith(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({ productSlugs: [], version: 1 }),
    );
  });

  it("ignores corrupt or obsolete stored cart data", () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({ productSlugs: ["legacy"], version: 0 }),
    );

    // act
    const { result } = renderHook(useStoreCart, { wrapper });

    // assert
    expect(result.current.productSlugs).toEqual([]);
  });

  it("keeps an in-memory cart when browser storage rejects writes", () => {
    // arrange
    const persist = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException(
          "Storage quota exceeded.",
          "QuotaExceededError",
        );
      });
    const { result } = renderHook(useStoreCart, { wrapper });

    // act
    act(() => {
      result.current.addProduct("hormone-harmony");
    });

    // assert
    expect(result.current.productSlugs).toEqual(["hormone-harmony"]);
    expect(persist).toHaveBeenCalled();
  });
});
