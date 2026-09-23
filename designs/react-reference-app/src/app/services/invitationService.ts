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
