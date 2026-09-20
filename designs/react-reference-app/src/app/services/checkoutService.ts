import type {
  SubscriptionBundle,
  SubscriptionStartPath,
} from '../domain/coachingSubscription';

export type PrototypeCheckoutOutcome = 'success' | 'cancelled' | 'failed';

export type CheckoutErrorCode = Extract<PrototypeCheckoutOutcome, 'failed'>;

export class CheckoutError extends Error {
  code: CheckoutErrorCode;

  constructor(code: CheckoutErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'CheckoutError';
  }
}

export const CHECKOUT_ERROR_MESSAGES: Record<CheckoutErrorCode, string> = {
  failed:
    'Your card was declined and nothing was charged. Try again, or use another card.',
};

export type CheckoutSelection = {
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
};

export type CheckoutSession = CheckoutSelection & {
  sessionId: string;
  token: string;
};

export type CompletedCheckout =
  | { status: 'success'; sessionId: string; paidAt: Date }
  | { status: 'cancelled'; sessionId: string };

export const SIMULATED_LATENCY_MS = 1100;

const sessions = new Map<string, CheckoutSession>();

function checkoutSessionId(): string {
  return `cs-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createCheckoutSession(
  token: string,
  selection: CheckoutSelection,
): Promise<CheckoutSession> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  const session = { sessionId: checkoutSessionId(), token, ...selection };
  sessions.set(session.sessionId, session);

  return session;
}

export function findCheckoutSession(sessionId: string): CheckoutSession | null {
  return sessions.get(sessionId) ?? null;
}

export async function completeCheckout(
  sessionId: string,
  outcome: PrototypeCheckoutOutcome,
): Promise<CompletedCheckout> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'failed') {
    throw new CheckoutError('failed', CHECKOUT_ERROR_MESSAGES.failed);
  }

  if (outcome === 'cancelled') return { status: 'cancelled', sessionId };

  return { status: 'success', sessionId, paidAt: new Date() };
}
