export type PrototypeStoreCheckoutOutcome =
  | 'success'
  | 'bot-rejected'
  | 'delivery-failure'
  | 'rate-limited'
  | 'server-error'
  | 'unavailable-product';

export type StoreAcquisitionErrorCode =
  | 'BOT_REJECTED'
  | 'DELIVERY_FAILURE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNAVAILABLE_PRODUCT';

export class StoreAcquisitionError extends Error {
  code: StoreAcquisitionErrorCode;
  constructor(code: StoreAcquisitionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'StoreAcquisitionError';
  }
}

export const STORE_ACQUISITION_ERROR_MESSAGES: Record<
  StoreAcquisitionErrorCode,
  string
> = {
  BOT_REJECTED: "We couldn't verify that you're human. Please try again.",
  DELIVERY_FAILURE:
    "We couldn't send your email right now. Your selections are saved — try again in a moment.",
  RATE_LIMITED:
    'Requests are limited to one per minute. Your selections are saved — please wait a moment and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again.',
  UNAVAILABLE_PRODUCT:
    "Some items in your cart are no longer available. We've updated your cart — review your selection and try again.",
};

const OUTCOME_ERROR_CODES: Record<
  Exclude<PrototypeStoreCheckoutOutcome, 'success'>,
  StoreAcquisitionErrorCode
> = {
  'bot-rejected': 'BOT_REJECTED',
  'delivery-failure': 'DELIVERY_FAILURE',
  'rate-limited': 'RATE_LIMITED',
  'server-error': 'SERVER_ERROR',
  'unavailable-product': 'UNAVAILABLE_PRODUCT',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIMULATED_LATENCY_MS = 1200;

export function isValidAcquisitionEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export type StoreAcquisitionRequest = {
  email: string;
  productIds: string[];
  marketingConsent: boolean;
  outcome: PrototypeStoreCheckoutOutcome;
};

export async function submitStoreAcquisition(
  request: StoreAcquisitionRequest,
): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (request.outcome !== 'success') {
    const code = OUTCOME_ERROR_CODES[request.outcome];
    throw new StoreAcquisitionError(
      code,
      STORE_ACQUISITION_ERROR_MESSAGES[code],
    );
  }

  return { success: true };
}
