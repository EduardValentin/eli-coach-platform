type InvitedAccountRole = "CLIENT";

export interface AccountInvitations {
  allow(invitation: {
    invitationId: string;
    email: string;
    role: InvitedAccountRole;
    expiresAt: Date;
  }): Promise<void>;
  acceptedInvitationOf(authSubjectId: string): Promise<string | null>;
}
