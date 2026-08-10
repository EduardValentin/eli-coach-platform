import {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
} from "react";
import { useStore } from "zustand";

import {
  createStoreCartStore,
  type StoreCartState,
  type StoreCartStore,
  useHydrateStoreCart,
} from "./cart";

const StoreCartContext = createContext<StoreCartStore | null>(null);

export function StoreCartProvider(props: PropsWithChildren) {
  const storeRef = useRef<StoreCartStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createStoreCartStore();
  }

  useHydrateStoreCart(storeRef.current);

  return (
    <StoreCartContext.Provider value={storeRef.current}>
      {props.children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart<Selected>(
  selector: (cart: StoreCartState) => Selected,
): Selected {
  const store = useContext(StoreCartContext);

  if (!store) {
    throw new Error("useStoreCart must be used within StoreCartProvider.");
  }

  return useStore(store, selector);
}
