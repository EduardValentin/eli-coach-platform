import { addDays } from 'date-fns';

export const INVITATION_VALIDITY_DAYS = 30;

export type SentInvitation = {
  token: string;
  email: string;
  sentAt: Date;
  expiresAt: Date;
};

export type PrototypeInvitationLinkState =
  | 'valid'
  | 'expired'
  | 'used'
  | 'unknown';

export type ResolvedInvitation =
  | { status: 'valid'; token: string }
  | { status: 'expired' }
  | { status: 'used' }
  | { status: 'unknown' };

export type PrototypeInvitationStanding = 'sent' | 'expired' | 'email-failed';

export const PROTOTYPE_INVITATION_STANDINGS: readonly PrototypeInvitationStanding[] = [
  'sent',
  'expired',
  'email-failed',
];

export type PrototypeInvitationResendOutcome = 'sent' | 'fails';

export const PROTOTYPE_INVITATION_RESEND_OUTCOMES: readonly PrototypeInvitationResendOutcome[] =
  ['sent', 'fails'];

export const INVITATION_RESEND_FAILURE_MESSAGE =
  'The invitation email could not be sent. Try again.';

export class InvitationResendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationResendError';
  }
}

export const SIMULATED_LATENCY_MS = 900;

function invitationToken(): string {
  return `inv-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInvitation(email: string, sentAt: Date): SentInvitation {
  return {
    token: invitationToken(),
    email,
    sentAt,
    expiresAt: addDays(sentAt, INVITATION_VALIDITY_DAYS),
  };
}

export async function resolveInvitation(
  token: string,
  state: PrototypeInvitationLinkState,
): Promise<ResolvedInvitation> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (state === 'valid') return { status: 'valid', token };

  return { status: state };
}

export async function resendInvitation(
  email: string,
  outcome: PrototypeInvitationResendOutcome,
): Promise<SentInvitation> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'fails') {
    throw new InvitationResendError(INVITATION_RESEND_FAILURE_MESSAGE);
  }

  return createInvitation(email, new Date());
}
