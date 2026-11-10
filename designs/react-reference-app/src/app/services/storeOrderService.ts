import { PAID_DIGITAL_DELIVERY_CONSENT } from '~/bounded-contexts/legal/public';
import type { Currency, Product } from '../context/StoreContext';
import { storeOrderLines, type StoreOrderLine } from '../domain/storeOrder';

export const PROTOTYPE_STORE_PAID_CHECKOUT_OUTCOMES = [
  'paid-success',
  'paid-not-completed',
  'checkout-unavailable',
  'unavailable-products',
  'subaddress-refused',
] as const;

export type PrototypeStorePaidCheckoutOutcome = (typeof PROTOTYPE_STORE_PAID_CHECKOUT_OUTCOMES)[number];

export const PROTOTYPE_STORE_ORDER_RESEND_OUTCOMES = ['sent', 'processing', 'rate-limited'] as const;

export type PrototypeStoreOrderResendOutcome = (typeof PROTOTYPE_STORE_ORDER_RESEND_OUTCOMES)[number];

export const SUBADDRESS_REFUSED_MESSAGE = 'Use your main email address, without a “+” part.';

export const SIMULATED_LATENCY_MS = 1100;

export type StoreOrderRequest = {
  email: string;
  items: readonly Product[];
  currency: Currency;
  termsAccepted: true;
  deliveryConsent: true;
  marketing: boolean;
  outcome: PrototypeStorePaidCheckoutOutcome;
};

export type PlacedStoreOrder =
  | { status: 'opened'; checkoutUrl: string }
  | { status: 'checkout_unavailable' }
  | { status: 'unavailable_products'; availableProductIds: string[] }
  | { status: 'subaddress_refused' };

export type StoreCheckoutSession = {
  sessionId: string;
  email: string;
  currency: Currency;
  lines: StoreOrderLine[];
  termsVersion: string;
  paid: boolean;
  completesPayment: boolean;
};

export type StoreOrderConfirmation =
  | {
      status: 'confirmed';
      email: string;
      currency: Currency;
      lines: StoreOrderLine[];
      termsVersion: string;
    }
  | { status: 'not_completed' };

export type StoreOrderEmailResend = 'sent' | 'processing' | 'rate_limited';

const RESEND_RESULTS: Record<PrototypeStoreOrderResendOutcome, StoreOrderEmailResend> = {
  sent: 'sent',
  processing: 'processing',
  'rate-limited': 'rate_limited',
};

const sessions = new Map<string, StoreCheckoutSession>();

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

function storeCheckoutSessionId(): string {
  return `cs_store_${Math.random().toString(36).slice(2, 10)}`;
}

export const STORE_PAYMENT_CANCELLED_URL = `${import.meta.env.BASE_URL}store?payment=cancelled`;

export function storeCheckoutUrl(sessionId: string): string {
  return `/checkout/store/${sessionId}`;
}

export function storeOrderCompleteUrl(sessionId: string): string {
  return `/store/checkout/complete?${new URLSearchParams({ session_id: sessionId })}`;
}

export async function placeStoreOrder(request: StoreOrderRequest): Promise<PlacedStoreOrder> {
  await simulateLatency();

  if (request.outcome === 'checkout-unavailable') return { status: 'checkout_unavailable' };
  if (request.outcome === 'subaddress-refused') return { status: 'subaddress_refused' };
  if (request.outcome === 'unavailable-products') {
    return {
      status: 'unavailable_products',
      availableProductIds: request.items.slice(0, -1).map((product) => product.id),
    };
  }

  const session: StoreCheckoutSession = {
    sessionId: storeCheckoutSessionId(),
    email: request.email,
    currency: request.currency,
    lines: storeOrderLines(request.items, request.currency),
    termsVersion: PAID_DIGITAL_DELIVERY_CONSENT.termsVersion,
    paid: false,
    completesPayment: request.outcome === 'paid-success',
  };
  sessions.set(session.sessionId, session);

  return { status: 'opened', checkoutUrl: storeCheckoutUrl(session.sessionId) };
}

export function findStoreCheckoutSession(sessionId: string): StoreCheckoutSession | null {
  return sessions.get(sessionId) ?? null;
}

export async function payStoreCheckout(sessionId: string): Promise<void> {
  await simulateLatency();

  const session = sessions.get(sessionId);
  if (session?.completesPayment) sessions.set(sessionId, { ...session, paid: true });
}

export async function readStoreOrder(sessionId: string): Promise<StoreOrderConfirmation> {
  await simulateLatency();

  const session = sessions.get(sessionId);
  if (!session?.paid) return { status: 'not_completed' };

  return {
    status: 'confirmed',
    email: session.email,
    currency: session.currency,
    lines: session.lines,
    termsVersion: session.termsVersion,
  };
}

export async function resendStoreOrderEmail(
  sessionId: string,
  outcome: PrototypeStoreOrderResendOutcome,
): Promise<StoreOrderEmailResend> {
  await simulateLatency();

  if (!sessions.get(sessionId)?.paid) return 'processing';

  return RESEND_RESULTS[outcome];
}
