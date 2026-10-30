import type { ClockPort } from "../clock-port";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIdsPort } from "./account-invitation-ids-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";

type IssueInvitationUseCaseOptions = {
  clockPort: ClockPort;
  accountInvitationIdsPort: AccountInvitationIdsPort;
  accountInvitationsPort: Pick<AccountInvitationsPort, "insert">;
  invitationTokenGeneratorPort: InvitationTokenGeneratorPort;
};

export class IssueInvitationUseCase {
  constructor(private readonly options: IssueInvitationUseCaseOptions) {}

  async execute(command: { email: string }): Promise<{ invitationId: string }> {
    const invitation = AccountInvitation.issue({
      id: this.options.accountInvitationIdsPort.generate(),
      email: command.email,
      role: "CLIENT",
      tokenHash: this.options.invitationTokenGeneratorPort.create().sha256,
      sentAt: this.options.clockPort.now(),
    });

    await this.options.accountInvitationsPort.insert(invitation);

    return { invitationId: invitation.id };
  }
}
