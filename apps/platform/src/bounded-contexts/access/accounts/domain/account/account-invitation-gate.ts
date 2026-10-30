import type { ClockPort } from "../clock-port";

import type { AccountRole } from "./account";
import type { AccountInvitation } from "./account-invitation";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationReferencesPort } from "./invitation-references-port";

type AccountInvitationGateOptions = {
  clock: ClockPort;
  invitations: Pick<AccountInvitationsPort, "findById" | "accept">;
  references: InvitationReferencesPort;
};

export class AccountInvitationGate {
  constructor(private readonly options: AccountInvitationGateOptions) {}

  async admit(authSubjectId: string): Promise<AccountRole | null> {
    const invitationId =
      await this.options.references.invitationIdOf(authSubjectId);

    if (!invitationId) {
      return null;
    }

    const invitation = await this.options.invitations.findById(invitationId);

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

    const now = this.options.clock.now();

    if (!invitation.isPending(now)) {
      return null;
    }

    const write = await this.options.invitations.accept({
      invitationId: invitation.id,
      authSubjectId,
      at: now,
    });

    if (write === "accepted") {
      return invitation.role;
    }

    const winner = await this.options.invitations.findById(invitation.id);

    return winner?.wasAcceptedBy(authSubjectId) ? winner.role : null;
  }
}
