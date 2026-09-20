import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CheckoutError,
  completeCheckout,
  createCheckoutSession,
  SIMULATED_LATENCY_MS,
} from './checkoutService';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('creating a checkout session', () => {
  it('carries the token and the chosen bundle into the session', async () => {
    // arrange
    const creating = createCheckoutSession('pl-abc123', {
      bundle: 3,
      startPath: 'immediate',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const session = await creating;
    expect(session).toMatchObject({
      token: 'pl-abc123',
      bundle: 3,
      startPath: 'immediate',
    });
    expect(session.sessionId).toMatch(/^cs-/);
  });

  it('keeps the waiting start path she did not waive', async () => {
    // arrange
    const creating = createCheckoutSession('pl-abc123', {
      bundle: 1,
      startPath: 'waiting',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(creating).resolves.toMatchObject({ startPath: 'waiting' });
  });
});

describe('completing a checkout', () => {
  it('dates the payment on success', async () => {
    // arrange
    const completing = completeCheckout('cs-abc123', 'success');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const completed = await completing;
    expect(completed).toMatchObject({ status: 'success', sessionId: 'cs-abc123' });
  });

  it('reports a cancelled checkout without treating it as a failure', async () => {
    // arrange
    const completing = completeCheckout('cs-abc123', 'cancelled');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(completing).resolves.toEqual({
      status: 'cancelled',
      sessionId: 'cs-abc123',
    });
  });

  it('rejects a failed payment with its own code', async () => {
    // arrange
    const completing = completeCheckout('cs-abc123', 'failed');
    const isDomainError = expect(completing).rejects.toBeInstanceOf(
      CheckoutError,
    );
    const carriesCode = expect(completing).rejects.toMatchObject({
      code: 'failed',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await isDomainError;
    await carriesCode;
  });
});
