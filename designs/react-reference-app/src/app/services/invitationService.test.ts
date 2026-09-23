import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInvitation,
  INVITATION_VALIDITY_DAYS,
  resolveInvitation,
  SIMULATED_LATENCY_MS,
} from './invitationService';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 10, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const DAY_MS = 24 * 60 * 60 * 1000;

describe('creating an invitation', () => {
  it('gives her thirty days to create her account', () => {
    // act
    const invitation = createInvitation('jane@example.com', new Date());

    // assert
    expect(invitation.token).toMatch(/^inv-/);
    expect(invitation.email).toBe('jane@example.com');
    expect(
      invitation.expiresAt.getTime() - invitation.sentAt.getTime(),
    ).toBe(INVITATION_VALIDITY_DAYS * DAY_MS);
  });
});

describe('resolving an invitation', () => {
  it('lets a valid token through', async () => {
    // arrange
    const resolving = resolveInvitation('inv-abc123', 'valid');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(resolving).resolves.toEqual({
      status: 'valid',
      token: 'inv-abc123',
    });
  });

  it.each(['expired', 'used', 'unknown'] as const)(
    'turns a %s invitation away',
    async (state) => {
      // arrange
      const resolving = resolveInvitation('inv-abc123', state);

      // act
      await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

      // assert
      await expect(resolving).resolves.toEqual({ status: state });
    },
  );
});
