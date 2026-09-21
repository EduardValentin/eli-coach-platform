import type {
  SubscriptionBundle,
  SubscriptionStartPath,
} from '../domain/coachingSubscription';

export type CheckoutSelection = {
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
};

export type CheckoutSession = CheckoutSelection & {
  sessionId: string;
  token: string;
};

export type CompletedCheckout = { sessionId: string; paidAt: Date };

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
): Promise<CompletedCheckout> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return { sessionId, paidAt: new Date() };
}
