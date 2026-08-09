import type { StoreProduct } from "@eli-coach-platform/contracts";
import { useEffect } from "react";
import type { PersistStorage } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export const STORE_CART_STORAGE_KEY = "eli-store-cart-v1";
const STORE_CART_STORAGE_VERSION = 1;

export type StoreCartState = {
  addProduct: (productSlug: string) => void;
  clearCart: () => void;
  closeCart: () => void;
  isHydrated: boolean;
  isOpen: boolean;
  markHydrated: () => void;
  openCartFrom: (opener: HTMLElement) => void;
  productSlugs: readonly string[];
  reconcileProducts: (availableProductSlugs: readonly string[]) => void;
  removeProduct: (productSlug: string) => void;
  restoreFocusToOpener: () => void;
  setPersistentCartControl: (control: HTMLButtonElement | null) => void;
};

type PersistedStoreCart = Pick<StoreCartState, "productSlugs">;

export type StoreCartStore = ReturnType<typeof createStoreCartStore>;

const storeCartStorage: PersistStorage<PersistedStoreCart> = {
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

export function createStoreCartStore() {
  const openerRef: { current: HTMLElement | null } = { current: null };
  const persistentCartControlRef: {
    current: HTMLButtonElement | null;
  } = { current: null };

  return createStore<StoreCartState>()(
    persist(
      (set) => ({
        addProduct: (productSlug) => {
          set((state) => ({
            productSlugs: state.productSlugs.includes(productSlug)
              ? state.productSlugs
              : [...state.productSlugs, productSlug],
          }));
        },
        clearCart: () => {
          set({ productSlugs: [] });
        },
        closeCart: () => {
          set({ isOpen: false });
        },
        isHydrated: false,
        isOpen: false,
        markHydrated: () => {
          set({ isHydrated: true });
        },
        openCartFrom: (opener) => {
          openerRef.current = opener;
          set({ isOpen: true });
        },
        productSlugs: [],
        reconcileProducts: (availableProductSlugs) => {
          const availableProducts = new Set(availableProductSlugs);

          set((state) => {
            const reconciledSlugs = state.productSlugs.filter((slug) =>
              availableProducts.has(slug),
            );

            return reconciledSlugs.length === state.productSlugs.length
              ? state
              : { productSlugs: reconciledSlugs };
          });
        },
        removeProduct: (productSlug) => {
          set((state) => ({
            productSlugs: state.productSlugs.filter(
              (slug) => slug !== productSlug,
            ),
          }));
        },
        restoreFocusToOpener: () => {
          const opener = openerRef.current;
          openerRef.current = null;
          const focusTarget = opener?.isConnected
            ? opener
            : persistentCartControlRef.current;

          if (focusTarget?.isConnected) {
            focusTarget.focus();
          }
        },
        setPersistentCartControl: (control) => {
          persistentCartControlRef.current = control;
        },
      }),
      {
        name: STORE_CART_STORAGE_KEY,
        partialize: (state) => ({ productSlugs: state.productSlugs }),
        skipHydration: true,
        storage: storeCartStorage,
        version: STORE_CART_STORAGE_VERSION,
      },
    ),
  );
}

export function useHydrateStoreCart(store: StoreCartStore): void {
  useEffect(() => {
    void Promise.resolve(store.persist.rehydrate()).then(() => {
      store.getState().markHydrated();
    });
  }, [store]);
}

export function useReconcileStoreCartCatalog(
  catalog: readonly StoreProduct[] | undefined,
  isHydrated: boolean,
  reconcileProducts: StoreCartState["reconcileProducts"],
): void {
  useEffect(() => {
    if (catalog && isHydrated) {
      reconcileProducts(catalog.map((product) => product.slug));
    }
  }, [catalog, isHydrated, reconcileProducts]);
}

export function selectStoreCartProducts(
  productSlugs: readonly string[],
  catalog: readonly StoreProduct[],
): readonly StoreProduct[] {
  const productsBySlug = new Map(
    catalog.map((product) => [product.slug, product]),
  );

  return productSlugs.flatMap((slug) => {
    const product = productsBySlug.get(slug);

    return product ? [product] : [];
  });
}

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
