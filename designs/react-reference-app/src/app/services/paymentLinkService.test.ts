import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PaymentLinkError,
  resolvePaymentLink,
  sendPaymentLink,
  SIMULATED_LATENCY_MS,
} from './paymentLinkService';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sending a payment link', () => {
  it('hands the coach a token she can share', async () => {
    // arrange
    const sending = sendPaymentLink('sent');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const link = await sending;
    expect(link.token).toMatch(/^pl-/);
    expect(link.sentAt).toBeInstanceOf(Date);
  });

  it('reports a delivery failure with its own code', async () => {
    // arrange
    const sending = sendPaymentLink('delivery-failure');
    const isDomainError = expect(sending).rejects.toBeInstanceOf(
      PaymentLinkError,
    );
    const carriesCode = expect(sending).rejects.toMatchObject({
      code: 'delivery-failure',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await isDomainError;
    await carriesCode;
  });
});

describe('resolving a payment link', () => {
  it('lets a valid token through with the token it was given', async () => {
    // arrange
    const resolving = resolvePaymentLink('pl-abc123', 'valid');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(resolving).resolves.toEqual({
      status: 'valid',
      token: 'pl-abc123',
    });
  });

  it.each(['expired', 'used', 'invalid'] as const)(
    'turns a %s token away',
    async (state) => {
      // arrange
      const resolving = resolvePaymentLink('pl-abc123', state);

      // act
      await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

      // assert
      await expect(resolving).resolves.toEqual({ status: state });
    },
  );
});
