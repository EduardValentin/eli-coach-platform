import type { ClockPort } from "../clock-port";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIdsPort } from "./account-invitation-ids-port";
import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationTokenGeneratorPort } from "./invitation-token-generator-port";

type IssueInvitationUseCaseOptions = {
  clock: ClockPort;
  ids: AccountInvitationIdsPort;
  invitations: Pick<AccountInvitationsPort, "insert">;
  tokenGenerator: InvitationTokenGeneratorPort;
};

export class IssueInvitationUseCase {
  constructor(private readonly options: IssueInvitationUseCaseOptions) {}

  async execute(command: { email: string }): Promise<{ invitationId: string }> {
    const invitation = AccountInvitation.issue({
      id: this.options.ids.generate(),
      email: command.email,
      role: "CLIENT",
      tokenHash: this.options.tokenGenerator.create().sha256,
      sentAt: this.options.clock.now(),
    });

    await this.options.invitations.insert(invitation);

    return { invitationId: invitation.id };
  }
}
