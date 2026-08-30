import { STORE_PRODUCTS, type Product } from '../context/StoreContext';

export type PrototypeLibraryOutcome = 'populated' | 'empty' | 'server-error';

export type PrototypeLibraryDownloadOutcome = 'success' | 'server-error';

export type LibraryErrorCode = 'LOAD_FAILURE' | 'DOWNLOAD_FAILURE';

export class LibraryError extends Error {
  code: LibraryErrorCode;
  constructor(code: LibraryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'LibraryError';
  }
}

export const LIBRARY_ERROR_MESSAGES: Record<LibraryErrorCode, string> = {
  LOAD_FAILURE:
    "We couldn't load your Library right now. Please try again.",
  DOWNLOAD_FAILURE:
    "We couldn't prepare your download right now. Please try again.",
};

// The account's owned products: paid purchases and free acquisitions linked to
// the account, indistinguishable from each other beyond the product's own type.
const OWNED_PRODUCT_IDS = [
  'fat-loss-30',
  'nutritional-reset',
  'hormone-harmony-ebook',
];

const SIMULATED_LATENCY_MS = 1200;

export async function fetchOwnedProducts(
  outcome: PrototypeLibraryOutcome,
): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'server-error') {
    throw new LibraryError('LOAD_FAILURE', LIBRARY_ERROR_MESSAGES.LOAD_FAILURE);
  }

  if (outcome === 'empty') {
    return [];
  }

  return STORE_PRODUCTS.filter((product) =>
    OWNED_PRODUCT_IDS.includes(product.id),
  );
}

export async function issueFreshDownloadAccess(
  productId: string,
  outcome: PrototypeLibraryDownloadOutcome,
): Promise<{ productId: string }> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'server-error') {
    throw new LibraryError(
      'DOWNLOAD_FAILURE',
      LIBRARY_ERROR_MESSAGES.DOWNLOAD_FAILURE,
    );
  }

  return { productId };
}
