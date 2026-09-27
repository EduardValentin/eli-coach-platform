import type { Clock } from "../shared";

import type { ClientInvitation } from "./client-invitation";
import type { ClientInvitations } from "./client-invitations";
import type { IdentityInvitations } from "./identity-invitations";

type InvitationAcceptanceOutcome = "accepted" | "refused";

type AcceptInvitationUseCaseOptions = {
  clock: Clock;
  identity: IdentityInvitations;
  invitations: ClientInvitations;
};

export class AcceptInvitationUseCase {
  constructor(private readonly options: AcceptInvitationUseCaseOptions) {}

  async execute(command: {
    authSubjectId: string;
  }): Promise<InvitationAcceptanceOutcome> {
    const invitationId = await this.options.identity.findInvitationIdForSubject(
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

    const now = this.options.clock.now();

    if (!invitation.isPending(now)) {
      return "refused";
    }

    const write = await this.options.invitations.accept({
      invitationId: invitation.id,
      authSubjectId,
      now,
    });

    if (write === "accepted") {
      return "accepted";
    }

    const winner = await this.options.invitations.findById(invitation.id);

    return winner?.wasAcceptedBy(authSubjectId) ? "accepted" : "refused";
  }
}
