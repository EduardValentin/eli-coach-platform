import type {
  AccountInvitationsPort,
  ClientInvitationStanding,
  InvitationDelivery,
  InvitationResendOutcome,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type { AccountInvitationsFacade } from "~/bounded-contexts/access/public/account-invitations-facade";

export class AccessAccountInvitationsAdapter implements AccountInvitationsPort {
  constructor(private readonly accountInvitations: AccountInvitationsFacade) {}

  issue(invitation: { email: string }): Promise<{ invitationId: string }> {
    return this.accountInvitations.issue({ email: invitation.email });
  }

  ensureDelivered(delivery: InvitationDelivery): Promise<void> {
    return this.accountInvitations.ensureDelivered({
      invitationId: delivery.invitationId,
      firstName: delivery.firstName,
    });
  }

  resend(delivery: InvitationDelivery): Promise<InvitationResendOutcome> {
    return this.accountInvitations.resend({
      invitationId: delivery.invitationId,
      firstName: delivery.firstName,
    });
  }

  async standingOf(
    invitationId: string,
  ): Promise<ClientInvitationStanding | null> {
    const standing = await this.accountInvitations.standingOf(invitationId);

    return standing
      ? {
          state: standing.state,
          sentAt: new Date(standing.sentAt),
          expiresAt: new Date(standing.expiresAt),
        }
      : null;
  }

  acceptedInvitationOf(authSubjectId: string): Promise<string | null> {
    return this.accountInvitations.acceptedInvitationOf(authSubjectId);
  }
}
