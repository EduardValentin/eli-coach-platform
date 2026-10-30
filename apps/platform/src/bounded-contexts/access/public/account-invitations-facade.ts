type InvitationStandingDto = {
  state: "pending" | "expired" | "email-failed";
  sentAt: string;
  expiresAt: string;
};

export type InvitationDeliveryDto = { invitationId: string; firstName: string };

type InvitationResendDto =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-accepted" }
  | { status: "not-found" };

export interface AccountInvitationsFacade {
  issue(invitation: { email: string }): Promise<{ invitationId: string }>;
  ensureDelivered(delivery: InvitationDeliveryDto): Promise<void>;
  resend(delivery: InvitationDeliveryDto): Promise<InvitationResendDto>;
  standingOf(invitationId: string): Promise<InvitationStandingDto | null>;
  acceptedInvitationOf(authSubjectId: string): Promise<string | null>;
}
