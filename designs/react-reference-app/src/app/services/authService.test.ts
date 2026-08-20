import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeSignIn, SignInError } from './authService';

describe('completeSignIn', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves as a signed-in user when provisioning succeeds', async () => {
    // arrange
    const completion = completeSignIn('success');

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(completion).resolves.toBe('user');
  });

  it('rejects with the provisioning failure when the account cannot be created', async () => {
    // arrange
    const completion = completeSignIn('provisioning-failure');
    const result = expect(completion).rejects.toMatchObject<Partial<SignInError>>(
      { code: 'PROVISIONING_FAILURE', name: 'SignInError' },
    );

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await result;
  });

  it('does not settle before the simulated backend latency elapses', async () => {
    // arrange
    const settled = vi.fn();
    completeSignIn('success').then(settled, settled);

    // act
    await vi.advanceTimersByTimeAsync(1199);

    // assert
    expect(settled).not.toHaveBeenCalled();
  });
});
