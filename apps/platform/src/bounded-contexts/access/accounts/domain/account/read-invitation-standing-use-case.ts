import type { ClockPort } from "../clock-port";

import type { InvitationStanding } from "./account-invitation";
import type { AccountInvitationsPort } from "./account-invitations-port";

type InvitationStandingReading = {
  state: InvitationStanding;
  sentAt: Date;
  expiresAt: Date;
};

type ReadInvitationStandingUseCaseOptions = {
  accountInvitationsPort: Pick<AccountInvitationsPort, "findById">;
  clockPort: ClockPort;
};

export class ReadInvitationStandingUseCase {
  constructor(private readonly options: ReadInvitationStandingUseCaseOptions) {}

  async execute(
    invitationId: string,
  ): Promise<InvitationStandingReading | null> {
    const invitation =
      await this.options.accountInvitationsPort.findById(invitationId);

    if (!invitation || invitation.isAccepted()) {
      return null;
    }

    return {
      state: invitation.standing(this.options.clockPort.now()),
      sentAt: invitation.sentAt,
      expiresAt: invitation.expiresAt,
    };
  }
}
