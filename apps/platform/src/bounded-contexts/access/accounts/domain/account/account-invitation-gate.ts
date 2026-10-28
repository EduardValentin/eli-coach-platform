import type { Clock } from "../clock";

import type { AccountRole } from "./account";
import type { AccountInvitation } from "./account-invitation";
import type { AccountInvitations } from "./account-invitations";
import type { InvitationReferences } from "./invitation-references";

type AccountInvitationGateOptions = {
  clock: Clock;
  invitations: Pick<AccountInvitations, "findById" | "accept">;
  references: InvitationReferences;
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
