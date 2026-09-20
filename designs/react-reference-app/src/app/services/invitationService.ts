import { addDays } from 'date-fns';
import type { JourneyIdentity } from '../domain/journey';

export type PrototypeInvitationOutcome =
  | 'sent'
  | 'replaced'
  | 'already-client'
  | 'delivery-failure';

export type InvitationErrorCode = Extract<
  PrototypeInvitationOutcome,
  'already-client' | 'delivery-failure'
>;

export class InvitationError extends Error {
  code: InvitationErrorCode;

  constructor(code: InvitationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'InvitationError';
  }
}

export const INVITATION_ERROR_MESSAGES: Record<InvitationErrorCode, string> = {
  'already-client':
    'That email already belongs to one of your clients, so nothing was saved.',
  'delivery-failure':
    'The profile and invitation were saved, but the email could not be sent.',
};

export const INVITATION_VALIDITY_DAYS = 30;

export type InvitationForm = JourneyIdentity;

export type SentInvitation = {
  token: string;
  email: string;
  sentAt: Date;
  expiresAt: Date;
  replaced: boolean;
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

export async function sendInvitation(
  form: InvitationForm,
  outcome: PrototypeInvitationOutcome,
): Promise<SentInvitation> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (outcome === 'already-client' || outcome === 'delivery-failure') {
    throw new InvitationError(outcome, INVITATION_ERROR_MESSAGES[outcome]);
  }

  const sentAt = new Date();

  return {
    token: invitationToken(),
    email: form.email,
    sentAt,
    expiresAt: addDays(sentAt, INVITATION_VALIDITY_DAYS),
    replaced: outcome === 'replaced',
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
