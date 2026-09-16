import { reconcileCart } from "@eli-coach-platform/domain/store";
import { useEffect } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { StoreProduct } from "~/features/store/contracts/store";

import { createFocusRestoreTracker } from "./cart-focus";
import type { PersistedStoreCart } from "./cart-storage";
import { STORE_CART_PERSIST_OPTIONS } from "./cart-storage";

export { STORE_CART_STORAGE_KEY } from "./cart-storage";

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
  takeFocusRestoreTarget: () => HTMLElement | null;
  setPersistentCartControl: (control: HTMLButtonElement | null) => void;
};

export type StoreCartStore = ReturnType<typeof createStoreCartStore>;

export function createStoreCartStore() {
  const focusRestoreTracker = createFocusRestoreTracker();

  return createStore<StoreCartState>()(
    persist<StoreCartState, [], [], PersistedStoreCart>(
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
          focusRestoreTracker.rememberOpener(opener);
          set({ isOpen: true });
        },
        productSlugs: [],
        reconcileProducts: (availableProductSlugs) => {
          set((state) => {
            const slugs = reconcileCart(state.productSlugs, availableProductSlugs);

            return slugs === state.productSlugs ? state : { productSlugs: slugs };
          });
        },
        removeProduct: (productSlug) => {
          set((state) => ({
            productSlugs: state.productSlugs.filter(
              (slug) => slug !== productSlug,
            ),
          }));
        },
        takeFocusRestoreTarget: () => focusRestoreTracker.take(),
        setPersistentCartControl: (control) => {
          focusRestoreTracker.setPersistentControl(control);
        },
      }),
      STORE_CART_PERSIST_OPTIONS,
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
