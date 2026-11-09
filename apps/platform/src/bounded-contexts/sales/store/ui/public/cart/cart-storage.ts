import { z } from "zod";
import type { PersistStorage } from "zustand/middleware";

export const STORE_CART_STORAGE_KEY = "eli-store-cart-v1";
export const STORE_CHECKOUT_DETAILS_STORAGE_KEY =
  "eli-store-checkout-details-v1";
const STORE_CART_STORAGE_VERSION = 1;

const storeCheckoutDetailsSchema = z.object({
  deliveryConsent: z.boolean(),
  email: z.string(),
  marketingConsent: z.boolean(),
  termsAccepted: z.boolean(),
});

export type StoreCheckoutDetails = z.infer<typeof storeCheckoutDetailsSchema>;

export type PersistedStoreCart = {
  checkoutDetails: StoreCheckoutDetails | null;
  productSlugs: readonly string[];
};

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
          checkoutDetails: readCheckoutDetails(),
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
      sessionStorage.removeItem(STORE_CHECKOUT_DETAILS_STORAGE_KEY);
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
      writeCheckoutDetails(storedCart.state.checkoutDetails);
    } catch {
      return;
    }
  },
};

export const STORE_CART_PERSIST_OPTIONS = {
  name: STORE_CART_STORAGE_KEY,
  partialize: (state: PersistedStoreCart) => ({
    checkoutDetails: state.checkoutDetails,
    productSlugs: state.productSlugs,
  }),
  skipHydration: true,
  storage: storeCartStorage,
  version: STORE_CART_STORAGE_VERSION,
};

function isPersistedStoreCart(storedCart: unknown): storedCart is {
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

function readCheckoutDetails(): StoreCheckoutDetails | null {
  try {
    const storedDetails = JSON.parse(
      sessionStorage.getItem(STORE_CHECKOUT_DETAILS_STORAGE_KEY) ?? "null",
    ) as unknown;

    return storeCheckoutDetailsSchema.safeParse(storedDetails).data ?? null;
  } catch {
    return null;
  }
}

function writeCheckoutDetails(details: StoreCheckoutDetails | null): void {
  if (details === null) {
    sessionStorage.removeItem(STORE_CHECKOUT_DETAILS_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(
    STORE_CHECKOUT_DETAILS_STORAGE_KEY,
    JSON.stringify(details),
  );
}
