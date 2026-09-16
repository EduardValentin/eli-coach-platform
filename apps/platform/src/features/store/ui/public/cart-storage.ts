import type { PersistStorage } from "zustand/middleware";

export const STORE_CART_STORAGE_KEY = "eli-store-cart-v1";
const STORE_CART_STORAGE_VERSION = 1;

export type PersistedStoreCart = { productSlugs: readonly string[] };

export const storeCartStorage: PersistStorage<PersistedStoreCart> = {
  getItem: () => {
    try {
      const storedCart = JSON.parse(
        localStorage.getItem(STORE_CART_STORAGE_KEY) ?? "null",
      ) as unknown;

      if (!isPersistedStoreCart(storedCart)) {
        return null;
      }

      return {
        state: {
          productSlugs: [...new Set(storedCart.productSlugs)],
        },
        version: STORE_CART_STORAGE_VERSION,
      };
    } catch {
      return null;
    }
  },
  removeItem: () => {
    try {
      localStorage.removeItem(STORE_CART_STORAGE_KEY);
    } catch {
      return;
    }
  },
  setItem: (_name, storedCart) => {
    try {
      localStorage.setItem(
        STORE_CART_STORAGE_KEY,
        JSON.stringify({
          productSlugs: storedCart.state.productSlugs,
          version: storedCart.version,
        }),
      );
    } catch {
      return;
    }
  },
};

export const STORE_CART_PERSIST_OPTIONS = {
  name: STORE_CART_STORAGE_KEY,
  partialize: (state: PersistedStoreCart) => ({
    productSlugs: state.productSlugs,
  }),
  skipHydration: true,
  storage: storeCartStorage,
  version: STORE_CART_STORAGE_VERSION,
};

function isPersistedStoreCart(
  storedCart: unknown,
): storedCart is {
  productSlugs: string[];
  version: typeof STORE_CART_STORAGE_VERSION;
} {
  return (
    typeof storedCart === "object" &&
    storedCart !== null &&
    "version" in storedCart &&
    storedCart.version === STORE_CART_STORAGE_VERSION &&
    "productSlugs" in storedCart &&
    Array.isArray(storedCart.productSlugs) &&
    storedCart.productSlugs.every((slug) => typeof slug === "string")
  );
}
