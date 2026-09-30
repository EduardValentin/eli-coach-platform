import type { JourneyInvitation } from './journey';

export type InvitationStanding = 'pending' | 'expired' | 'email-failed';

export function invitationStanding(
  invitation: JourneyInvitation,
  now: Date,
): InvitationStanding {
  if (invitation.emailDelivery === 'failed') return 'email-failed';
  if (invitation.expiresAt.getTime() <= now.getTime()) return 'expired';

  return 'pending';
}
