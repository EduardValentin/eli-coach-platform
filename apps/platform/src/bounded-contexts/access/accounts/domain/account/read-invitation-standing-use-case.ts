import type { Clock } from "../clock";

import type { InvitationStanding } from "./account-invitation";
import type { AccountInvitations } from "./account-invitations";

type InvitationStandingReading = {
  state: InvitationStanding;
  sentAt: Date;
  expiresAt: Date;
};

type ReadInvitationStandingUseCaseOptions = {
  invitations: Pick<AccountInvitations, "findById">;
  clock: Clock;
};

export class ReadInvitationStandingUseCase {
  constructor(private readonly options: ReadInvitationStandingUseCaseOptions) {}

  async execute(
    invitationId: string,
  ): Promise<InvitationStandingReading | null> {
    const invitation = await this.options.invitations.findById(invitationId);

    if (!invitation || invitation.acceptedAt) {
      return null;
    }

    return {
      state: invitation.standing(this.options.clock.now()),
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
    };
  }
}
