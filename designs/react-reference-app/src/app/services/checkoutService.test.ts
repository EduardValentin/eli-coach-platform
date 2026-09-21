import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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
  it('dates the payment', async () => {
    // arrange
    const completing = completeCheckout('cs-abc123');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const completed = await completing;
    expect(completed.sessionId).toBe('cs-abc123');
    expect(completed.paidAt).toBeInstanceOf(Date);
  });
});
