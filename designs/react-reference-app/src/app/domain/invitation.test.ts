import { addDays, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { invitationStanding } from './invitation';
import type { JourneyInvitation } from './journey';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

function invitationSent(sentAt: Date): JourneyInvitation {
  return {
    token: 'inv-1',
    sentAt,
    expiresAt: addDays(sentAt, 30),
    state: 'valid',
    emailDelivery: 'sent',
  };
}

describe('the standing of an invitation the coach reads', () => {
  it('is pending while the link still works', () => {
    // arrange
    const invitation = invitationSent(subDays(NOW, 5));

    // act
    const standing = invitationStanding(invitation, NOW);

    // assert
    expect(standing).toBe('pending');
  });

  it('is expired once the thirty days have run out', () => {
    // arrange
    const invitation = invitationSent(subDays(NOW, 31));

    // act
    const standing = invitationStanding(invitation, NOW);

    // assert
    expect(standing).toBe('expired');
  });

  it('reports a failed email before an expiry', () => {
    // arrange
    const invitation: JourneyInvitation = {
      ...invitationSent(subDays(NOW, 31)),
      emailDelivery: 'failed',
    };

    // act
    const standing = invitationStanding(invitation, NOW);

    // assert
    expect(standing).toBe('email-failed');
  });
});
