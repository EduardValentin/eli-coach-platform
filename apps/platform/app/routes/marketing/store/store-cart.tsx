import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

const StoreCartContext = createContext<StoreCart | null>(null);

export function StoreCartProvider(props: PropsWithChildren) {
  const [productSlugs, setProductSlugs] = useState<readonly string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasRestoredPersistedCart, setHasRestoredPersistedCart] =
    useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const persistentCartControlRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setProductSlugs(readPersistedProductSlugs());
    setHasRestoredPersistedCart(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredPersistedCart) {
      return;
    }

    persistProductSlugs(productSlugs);
  }, [hasRestoredPersistedCart, productSlugs]);

  const addProduct = useCallback((productSlug: string) => {
    setProductSlugs((currentSlugs) =>
      currentSlugs.includes(productSlug)
        ? currentSlugs
        : [...currentSlugs, productSlug],
    );
  }, []);
  const clearCart = useCallback(() => {
    setProductSlugs([]);
  }, []);
  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);
  const openCartFrom = useCallback((opener: HTMLElement) => {
    openerRef.current = opener;
    setIsOpen(true);
  }, []);
  const reconcileProducts = useCallback(
    (availableProductSlugs: readonly string[]) => {
      const availableProducts = new Set(availableProductSlugs);
      setProductSlugs((currentSlugs) => {
        const reconciledSlugs = currentSlugs.filter((slug) =>
          availableProducts.has(slug),
        );

        return reconciledSlugs.length === currentSlugs.length
          ? currentSlugs
          : reconciledSlugs;
      });
    },
    [],
  );
  const removeProduct = useCallback((productSlug: string) => {
    setProductSlugs((currentSlugs) =>
      currentSlugs.filter((slug) => slug !== productSlug),
    );
  }, []);
  const setPersistentCartControl = useCallback(
    (control: HTMLButtonElement | null) => {
      persistentCartControlRef.current = control;
    },
    [],
  );
  const restoreFocusToOpener = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    const focusTarget = opener?.isConnected
      ? opener
      : persistentCartControlRef.current;

    if (focusTarget?.isConnected) {
      focusTarget.focus();
    }
  }, []);

  const value = useMemo<StoreCart>(
    () => ({
      addProduct,
      clearCart,
      closeCart,
      isOpen,
      openCartFrom,
      productSlugs,
      reconcileProducts,
      removeProduct,
      restoreFocusToOpener,
      setPersistentCartControl,
    }),
    [
      addProduct,
      clearCart,
      closeCart,
      isOpen,
      openCartFrom,
      productSlugs,
      reconcileProducts,
      removeProduct,
      restoreFocusToOpener,
      setPersistentCartControl,
    ],
  );

  return (
    <StoreCartContext.Provider value={value}>
      {props.children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart(): StoreCart {
  const cart = useContext(StoreCartContext);

  if (!cart) {
    throw new Error("useStoreCart must be used within StoreCartProvider.");
  }

  return cart;
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
