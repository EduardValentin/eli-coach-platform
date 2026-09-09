import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeSignIn, SignInError } from './authService';

describe('completeSignIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['client', 'coach'] as const)(
    'resolves as a signed-in %s when provisioning succeeds',
    async (role) => {
      // arrange
      const completion = completeSignIn(role);

      // act
      await vi.advanceTimersByTimeAsync(1200);

      // assert
      await expect(completion).resolves.toBe(role);
    },
  );

  it('rejects with the provisioning failure when the account cannot be created', async () => {
    // arrange
    const completion = completeSignIn('provisioning-failure');
    // Both assertions attach before the timer runs, so the rejection is never
    // momentarily unhandled.
    const isSignInError = expect(completion).rejects.toBeInstanceOf(SignInError);
    const carriesCode = expect(completion).rejects.toMatchObject({
      code: 'PROVISIONING_FAILURE',
    });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await isSignInError;
    await carriesCode;
  });

  it('does not settle before the simulated backend latency elapses', async () => {
    // arrange
    const settled = vi.fn();
    completeSignIn('client').then(settled, settled);

    // act
    await vi.advanceTimersByTimeAsync(1199);

    // assert
    expect(settled).not.toHaveBeenCalled();
  });
});
