import type {
  ClientInvitationStanding,
  InvitationResendOutcome,
} from "./client-invitation";

export type InvitationDelivery = { invitationId: string; firstName: string };

export interface AccountInvitationsPort {
  issue(invitation: { email: string }): Promise<{ invitationId: string }>;
  ensureDelivered(delivery: InvitationDelivery): Promise<void>;
  resend(delivery: InvitationDelivery): Promise<InvitationResendOutcome>;
  standingOf(invitationId: string): Promise<ClientInvitationStanding | null>;
  acceptedInvitationOf(authSubjectId: string): Promise<string | null>;
}
