import type { Clock } from "../clock";

import type { AccountInvitations } from "./account-invitations";
import type { ClientInvitation } from "./client-invitation";
import type { ClientInvitations } from "./client-invitations";

type InvitationAcceptanceOutcome = "accepted" | "refused";

type AcceptInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitations, "acceptedInvitationOf">;
  clock: Clock;
  invitations: ClientInvitations;
};

export class AcceptInvitationUseCase {
  constructor(private readonly options: AcceptInvitationUseCaseOptions) {}

  async execute(command: {
    authSubjectId: string;
  }): Promise<InvitationAcceptanceOutcome> {
    const invitationId =
      await this.options.accountInvitations.acceptedInvitationOf(
        command.authSubjectId,
      );

    if (!invitationId) {
      return "refused";
    }

    const invitation = await this.options.invitations.findById(invitationId);

    if (!invitation) {
      return "refused";
    }

    return this.accept(invitation, command.authSubjectId);
  }

  private async accept(
    invitation: ClientInvitation,
    authSubjectId: string,
  ): Promise<InvitationAcceptanceOutcome> {
    if (invitation.wasAcceptedBy(authSubjectId)) {
      return "accepted";
    }

    const write = await this.options.invitations.accept({
      invitationId: invitation.id,
      authSubjectId,
      now: this.options.clock.now(),
    });

    if (write === "accepted") {
      return "accepted";
    }

    const winner = await this.options.invitations.findById(invitation.id);

    return winner?.wasAcceptedBy(authSubjectId) ? "accepted" : "refused";
  }
}
