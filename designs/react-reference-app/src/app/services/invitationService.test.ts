import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVITATION_VALIDITY_DAYS,
  InvitationError,
  resolveInvitation,
  sendInvitation,
  SIMULATED_LATENCY_MS,
  type InvitationForm,
} from './invitationService';

const form: InvitationForm = {
  firstName: 'Jane',
  lastName: 'Doe',
  birth: { kind: 'age', age: 28 },
  email: 'jane@example.com',
  sex: 'female',
  country: 'Romania',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 10, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const DAY_MS = 24 * 60 * 60 * 1000;

describe('sending an invitation', () => {
  it('gives her thirty days to create her account', async () => {
    // arrange
    const sending = sendInvitation(form, 'sent');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const invitation = await sending;
    expect(invitation.token).toMatch(/^inv-/);
    expect(invitation.email).toBe('jane@example.com');
    expect(
      invitation.expiresAt.getTime() - invitation.sentAt.getTime(),
    ).toBe(INVITATION_VALIDITY_DAYS * DAY_MS);
  });

  it('reports a first invitation as not having replaced anything', async () => {
    // arrange
    const sending = sendInvitation(form, 'sent');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(sending).resolves.toMatchObject({ replaced: false });
  });

  it('reports that a pending invitation was replaced', async () => {
    // arrange
    const sending = sendInvitation(form, 'replaced');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(sending).resolves.toMatchObject({ replaced: true });
  });

  it('refuses an email that already belongs to a client, saving nothing', async () => {
    // arrange
    const sending = sendInvitation(form, 'already-client');
    const isDomainError = expect(sending).rejects.toBeInstanceOf(
      InvitationError,
    );
    const carriesMessage = expect(sending).rejects.toMatchObject({
      code: 'already-client',
      message:
        'That email already belongs to one of your clients, so nothing was saved.',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await isDomainError;
    await carriesMessage;
  });

  it('reports a delivery failure separately, because the record survives it', async () => {
    // arrange
    const sending = sendInvitation(form, 'delivery-failure');
    const carriesMessage = expect(sending).rejects.toMatchObject({
      code: 'delivery-failure',
      message:
        'The profile and invitation were saved, but the email could not be sent.',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await carriesMessage;
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
