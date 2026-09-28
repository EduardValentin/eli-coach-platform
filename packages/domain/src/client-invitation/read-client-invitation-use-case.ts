import type { Clock } from "../shared";

import type { InvitationStanding } from "./client-invitation";
import type { ClientInvitations } from "./client-invitations";

type ClientInvitationReading = {
  state: InvitationStanding;
  sentAt: Date;
  expiresAt: Date;
};

type ReadClientInvitationUseCaseOptions = {
  invitations: ClientInvitations;
  clock: Clock;
};

export class ReadClientInvitationUseCase {
  constructor(private readonly options: ReadClientInvitationUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientInvitationReading | null> {
    const invitation = await this.options.invitations.findByClientId(clientId);

    if (!invitation || invitation.usedAt) {
      return null;
    }

    return {
      state: invitation.standing(this.options.clock.now()),
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
    };
  }
}
