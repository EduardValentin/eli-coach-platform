import type { ClockPort } from "../clock-port";

import type { AccountRole } from "./account";
import type { AccountInvitation } from "./account-invitation";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationReferencesPort } from "./invitation-references-port";

type AccountInvitationGateOptions = {
  clockPort: ClockPort;
  accountInvitationsPort: Pick<AccountInvitationsPort, "findById" | "accept">;
  invitationReferencesPort: InvitationReferencesPort;
};

export class AccountInvitationGate {
  constructor(private readonly options: AccountInvitationGateOptions) {}

  async admit(authSubjectId: string): Promise<AccountRole | null> {
    const invitationId =
      await this.options.invitationReferencesPort.invitationIdOf(authSubjectId);

    if (!invitationId) {
      return null;
    }

    const invitation =
      await this.options.accountInvitationsPort.findById(invitationId);

    if (!invitation?.invitesClient()) {
      return null;
    }

    return this.accept(invitation, authSubjectId);
  }

  private async accept(
    invitation: AccountInvitation,
    authSubjectId: string,
  ): Promise<AccountRole | null> {
    if (invitation.wasAcceptedBy(authSubjectId)) {
      return invitation.role;
    }

    const now = this.options.clockPort.now();

    if (!invitation.isPending(now)) {
      return null;
    }

    const write = await this.options.accountInvitationsPort.accept({
      invitationId: invitation.id,
      authSubjectId,
      at: now,
    });

    if (write === "accepted") {
      return invitation.role;
    }

    const winner = await this.options.accountInvitationsPort.findById(
      invitation.id,
    );

    return winner?.wasAcceptedBy(authSubjectId) ? winner.role : null;
  }
}
