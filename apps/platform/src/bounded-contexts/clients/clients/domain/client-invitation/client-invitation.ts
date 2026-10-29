type InvitationStanding = "pending" | "expired" | "email-failed";

export type ClientInvitationStanding = {
  state: InvitationStanding;
  sentAt: Date;
  expiresAt: Date;
};

export type InvitationResendOutcome =
  | { status: "sent"; email: string }
  | { status: "failed" }
  | { status: "already-accepted" }
  | { status: "not-found" };
