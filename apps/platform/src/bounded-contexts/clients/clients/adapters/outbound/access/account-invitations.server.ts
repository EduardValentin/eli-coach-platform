import type { AccountInvitations } from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations";

export class AccessAccountInvitations implements AccountInvitations {
  constructor(private readonly accountInvitations: AccountInvitationsFacade) {}

  allow(invitation: Parameters<AccountInvitations["allow"]>[0]): Promise<void> {
    return this.accountInvitations.allowAccount({
      invitationId: invitation.invitationId,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  }

  acceptedInvitationOf(authSubjectId: string): Promise<string | null> {
    return this.accountInvitations.acceptedInvitationOf(authSubjectId);
  }
}
