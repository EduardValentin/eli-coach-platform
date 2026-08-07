// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import {
  StrictMode,
  type PropsWithChildren,
} from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createStoreCartStore,
  STORE_CART_STORAGE_KEY,
} from "./store-cart";
import {
  StoreCartProvider,
  useStoreCart,
} from "./store-cart-provider";

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

function AlternateCartOpener() {
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <button
      onClick={(event) => openCartFrom(event.currentTarget)}
      type="button"
    >
      Open cart elsewhere
    </button>
  );
}

function CartContentsConsumer(props: { onRender: () => void }) {
  const productSlugs = useStoreCart((cart) => cart.productSlugs);
  props.onRender();

  return <output>{productSlugs.length}</output>;
}

function useWholeStoreCart() {
  return useStoreCart((cart) => cart);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StoreCartProvider", () => {
  it("does not rerender a cart contents consumer when only drawer visibility changes", async () => {
    // arrange
    const user = userEvent.setup();
    const recordCartContentsRender = vi.fn();
    render(
      <StoreCartProvider>
        <CartContentsConsumer onRender={recordCartContentsRender} />
        <AlternateCartOpener />
      </StoreCartProvider>,
    );
    const renderCountBeforeOpening = recordCartContentsRender.mock.calls.length;

    // act
    await user.click(
      screen.getByRole("button", { name: "Open cart elsewhere" }),
    );

    // assert
    expect(recordCartContentsRender).toHaveBeenCalledTimes(
      renderCountBeforeOpening,
    );
  });

  it("persists unique product identifiers without catalog or personal data", () => {
    // arrange
    const { result } = renderHook(useWholeStoreCart, { wrapper });

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

  it("labels persisted carts with the configured schema version", () => {
    // arrange
    const cart = createStoreCartStore();
    cart.persist.setOptions({ version: 2 });

    // act
    cart.getState().addProduct("hormone-harmony");

    // assert
    expect(JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!)).toEqual({
      productSlugs: ["hormone-harmony"],
      version: 2,
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
    const { result } = renderHook(useWholeStoreCart, { wrapper });

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
    const { result } = renderHook(useWholeStoreCart, {
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
    const { result } = renderHook(useWholeStoreCart, { wrapper });

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
    const { result } = renderHook(useWholeStoreCart, { wrapper });

    // act
    act(() => {
      result.current.addProduct("hormone-harmony");
    });

    // assert
    expect(result.current.productSlugs).toEqual(["hormone-harmony"]);
    expect(persist).toHaveBeenCalled();
  });
});
