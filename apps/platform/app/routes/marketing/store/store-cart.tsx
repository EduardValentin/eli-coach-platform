import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export const STORE_CART_STORAGE_KEY = "eli-store-cart-v1";

type StoreCart = {
  addProduct: (productSlug: string) => void;
  clearCart: () => void;
  closeCart: () => void;
  isOpen: boolean;
  openCartFrom: (opener: HTMLElement) => void;
  productSlugs: readonly string[];
  reconcileProducts: (availableProductSlugs: readonly string[]) => void;
  removeProduct: (productSlug: string) => void;
  restoreFocusToOpener: () => void;
  setPersistentCartControl: (control: HTMLButtonElement | null) => void;
};

type StoreCartStore = ReturnType<typeof createStoreCartStore>;

const StoreCartContext = createContext<StoreCartStore | null>(null);

export function StoreCartProvider(props: PropsWithChildren) {
  const storeRef = useRef<StoreCartStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createStoreCartStore();
  }

  const store = storeRef.current;

  useEffect(() => {
    store.setState({ productSlugs: readPersistedProductSlugs() });

    return store.subscribe((state, previousState) => {
      if (state.productSlugs !== previousState.productSlugs) {
        persistProductSlugs(state.productSlugs);
      }
    });
  }, [store]);

  return (
    <StoreCartContext.Provider value={store}>
      {props.children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart<Selected>(
  selector: (cart: StoreCart) => Selected,
): Selected {
  const store = useContext(StoreCartContext);

  if (!store) {
    throw new Error("useStoreCart must be used within StoreCartProvider.");
  }

  return useStore(store, selector);
}

function createStoreCartStore() {
  const openerRef: { current: HTMLElement | null } = { current: null };
  const persistentCartControlRef: {
    current: HTMLButtonElement | null;
  } = { current: null };

  return createStore<StoreCart>()((set) => ({
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
    isOpen: false,
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
  }));
}

function readPersistedProductSlugs(): readonly string[] {
  try {
    const storedCart = JSON.parse(
      localStorage.getItem(STORE_CART_STORAGE_KEY) ?? "null",
    ) as unknown;

    if (
      typeof storedCart !== "object" ||
      storedCart === null ||
      !("version" in storedCart) ||
      storedCart.version !== 1 ||
      !("productSlugs" in storedCart) ||
      !Array.isArray(storedCart.productSlugs) ||
      storedCart.productSlugs.some((slug) => typeof slug !== "string")
    ) {
      return [];
    }

    return [...new Set(storedCart.productSlugs)];
  } catch {
    return [];
  }
}

function persistProductSlugs(productSlugs: readonly string[]): void {
  try {
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs,
        version: 1,
      }),
    );
  } catch {
    return;
  }
}
