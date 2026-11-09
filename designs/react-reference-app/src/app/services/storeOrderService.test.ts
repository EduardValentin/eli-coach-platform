import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORE_PRODUCTS } from '../context/StoreContext';
import {
  findStoreCheckoutSession,
  payStoreCheckout,
  placeStoreOrder,
  readStoreOrder,
  resendStoreOrderEmail,
  type PlacedStoreOrder,
  type PrototypeStorePaidCheckoutOutcome,
  type StoreOrderRequest,
} from './storeOrderService';

const paidPlan = STORE_PRODUCTS.find((product) => product.id === 'fat-loss-30')!;
const freeEbook = STORE_PRODUCTS.find((product) => product.id === 'hormone-harmony-ebook')!;

function orderRequest(outcome: PrototypeStorePaidCheckoutOutcome): StoreOrderRequest {
  return {
    email: 'woman@example.com',
    items: [paidPlan, freeEbook],
    currency: 'EUR',
    termsAccepted: true,
    deliveryConsent: true,
    marketing: false,
    outcome,
  };
}

async function settle<Result>(pending: Promise<Result>): Promise<Result> {
  await vi.runAllTimersAsync();
  return pending;
}

function sessionIdOf(placed: PlacedStoreOrder): string {
  if (placed.status !== 'opened') throw new Error(`Checkout did not open: ${placed.status}`);
  return placed.checkoutUrl.split('/').pop()!;
}

describe('storeOrderService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a checkout session with her locked email and every item priced in her currency', async () => {
    // arrange
    const request = orderRequest('paid-success');

    // act
    const placed = await settle(placeStoreOrder(request));

    // assert
    expect(placed.status).toBe('opened');
    const session = findStoreCheckoutSession(sessionIdOf(placed));
    expect(session).toMatchObject({
      email: 'woman@example.com',
      currency: 'EUR',
      paid: false,
      termsVersion: '1.0',
      lines: [
        { productId: 'fat-loss-30', amount: 39 },
        { productId: 'hormone-harmony-ebook', amount: null },
      ],
    });
  });

  it.each([
    ['checkout-unavailable', { status: 'checkout_unavailable' }],
    ['subaddress-refused', { status: 'subaddress_refused' }],
    ['unavailable-products', { status: 'unavailable_products', availableProductIds: ['fat-loss-30'] }],
  ] as const)('answers the %s outcome without opening a session', async (outcome, expected) => {
    // arrange
    const request = orderRequest(outcome);

    // act
    const placed = await settle(placeStoreOrder(request));

    // assert
    expect(placed).toEqual(expected);
  });

  it('confirms the order once the hosted page takes the payment', async () => {
    // arrange
    const sessionId = sessionIdOf(await settle(placeStoreOrder(orderRequest('paid-success'))));

    // act
    await settle(payStoreCheckout(sessionId));
    const confirmation = await settle(readStoreOrder(sessionId));

    // assert
    expect(confirmation).toMatchObject({
      status: 'confirmed',
      email: 'woman@example.com',
      currency: 'EUR',
      termsVersion: '1.0',
    });
  });

  it('reports the order as not completed when the payment did not go through', async () => {
    // arrange
    const sessionId = sessionIdOf(await settle(placeStoreOrder(orderRequest('paid-not-completed'))));

    // act
    await settle(payStoreCheckout(sessionId));
    const confirmation = await settle(readStoreOrder(sessionId));

    // assert
    expect(confirmation).toEqual({ status: 'not_completed' });
  });

  it('reports an unknown session as not completed', async () => {
    // arrange
    const unknownSessionId = 'cs_store_unknown';

    // act
    const confirmation = await settle(readStoreOrder(unknownSessionId));

    // assert
    expect(confirmation).toEqual({ status: 'not_completed' });
  });

  it.each([
    ['sent', 'sent'],
    ['processing', 'processing'],
    ['rate-limited', 'rate_limited'],
  ] as const)('answers a resend of a paid order with the %s outcome', async (outcome, expected) => {
    // arrange
    const sessionId = sessionIdOf(await settle(placeStoreOrder(orderRequest('paid-success'))));
    await settle(payStoreCheckout(sessionId));

    // act
    const resend = await settle(resendStoreOrderEmail(sessionId, outcome));

    // assert
    expect(resend).toBe(expected);
  });

  it('answers a resend before payment as still processing', async () => {
    // arrange
    const sessionId = sessionIdOf(await settle(placeStoreOrder(orderRequest('paid-success'))));

    // act
    const resend = await settle(resendStoreOrderEmail(sessionId, 'sent'));

    // assert
    expect(resend).toBe('processing');
  });
});
