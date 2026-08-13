export type PrototypeStoreCheckoutOutcome =
  | 'success'
  | 'bot-rejected'
  | 'delivery-failure'
  | 'rate-limited-cooldown'
  | 'rate-limited-daily'
  | 'server-error'
  | 'unavailable-product';

export type StoreAcquisitionErrorCode =
  | 'BOT_REJECTED'
  | 'DELIVERY_FAILURE'
  | 'RATE_LIMITED_COOLDOWN'
  | 'RATE_LIMITED_DAILY'
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
  RATE_LIMITED_COOLDOWN:
    'Requests are limited to one per minute. Your selections are saved — please wait a moment and try again.',
  RATE_LIMITED_DAILY:
    "You've reached today's request limit. Your selections are saved — please try again later.",
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
  'rate-limited-cooldown': 'RATE_LIMITED_COOLDOWN',
  'rate-limited-daily': 'RATE_LIMITED_DAILY',
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
