import { Cart } from "~/bounded-contexts/sales/store/domain/cart";
import { normalizeBasePath } from "~/shared/http/base-path";
import { useEffect } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";
import {
  STORE_CURRENCY_COOKIE_NAME,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/public/store-currency";

import { createFocusRestoreTracker } from "./cart-focus";
import type { PersistedStoreCart, StoreCheckoutDetails } from "./cart-storage";
import { STORE_CART_PERSIST_OPTIONS } from "./cart-storage";

export { STORE_CART_STORAGE_KEY } from "./cart-storage";

const STORE_CURRENCY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type StoreCartNotice = "payment-not-completed";

export type StoreCartState = {
  addProduct: (productSlug: string) => void;
  checkoutDetails: StoreCheckoutDetails | null;
  clearCart: () => void;
  closeCart: () => void;
  currency: StoreCurrency;
  dismissNotice: () => void;
  isHydrated: boolean;
  isOpen: boolean;
  markHydrated: () => void;
  notice: StoreCartNotice | null;
  openCartAfterCancelledPayment: () => void;
  openCartFrom: (opener: HTMLElement) => void;
  productSlugs: readonly string[];
  reconcileProducts: (availableProductSlugs: readonly string[]) => void;
  rememberCheckoutDetails: (details: StoreCheckoutDetails) => void;
  removeProduct: (productSlug: string) => void;
  setCurrency: (currency: StoreCurrency) => void;
  takeCheckoutDetails: () => StoreCheckoutDetails | null;
  takeFocusRestoreTarget: () => HTMLElement | null;
  setPersistentCartControl: (control: HTMLButtonElement | null) => void;
};

export type StoreCartStore = ReturnType<typeof createStoreCartStore>;

export function createStoreCartStore(initialCurrency: StoreCurrency) {
  const focusRestoreTracker = createFocusRestoreTracker();

  return createStore<StoreCartState>()(
    persist<StoreCartState, [], [], PersistedStoreCart>(
      (set, get) => ({
        addProduct: (productSlug) => {
          set((state) => ({
            productSlugs: state.productSlugs.includes(productSlug)
              ? state.productSlugs
              : [...state.productSlugs, productSlug],
          }));
        },
        checkoutDetails: null,
        clearCart: () => {
          set({ checkoutDetails: null, productSlugs: [] });
        },
        closeCart: () => {
          set({ isOpen: false, notice: null });
        },
        currency: initialCurrency,
        dismissNotice: () => {
          set({ notice: null });
        },
        isHydrated: false,
        isOpen: false,
        markHydrated: () => {
          set({ isHydrated: true });
        },
        notice: null,
        openCartAfterCancelledPayment: () => {
          set({ isOpen: true, notice: "payment-not-completed" });
        },
        openCartFrom: (opener) => {
          focusRestoreTracker.rememberOpener(opener);
          set({ isOpen: true });
        },
        productSlugs: [],
        reconcileProducts: (availableProductSlugs) => {
          set((state) => {
            const cart = Cart.of(state.productSlugs);
            const reconciled = cart.reconcile(availableProductSlugs);

            return reconciled === cart
              ? state
              : { productSlugs: reconciled.slugs };
          });
        },
        rememberCheckoutDetails: (details) => {
          set({ checkoutDetails: details });
        },
        removeProduct: (productSlug) => {
          set((state) => ({
            productSlugs: state.productSlugs.filter(
              (slug) => slug !== productSlug,
            ),
          }));
        },
        setCurrency: (currency) => {
          rememberStoreCurrency(currency);
          set({ currency });
        },
        takeCheckoutDetails: () => {
          const { checkoutDetails } = get();
          set({ checkoutDetails: null });

          return checkoutDetails;
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

function rememberStoreCurrency(currency: StoreCurrency): void {
  const attributes = [
    `${STORE_CURRENCY_COOKIE_NAME}=${currency}`,
    `Path=${normalizeBasePath(import.meta.env.BASE_URL)}`,
    `Max-Age=${STORE_CURRENCY_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ];

  if (window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
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
