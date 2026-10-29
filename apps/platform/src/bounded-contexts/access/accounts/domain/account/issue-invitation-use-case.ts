import type { Clock } from "../clock";

import { AccountInvitation } from "./account-invitation";
import type { AccountInvitationIds } from "./account-invitation-ids";
import type { AccountInvitations } from "./account-invitations";
import type { InvitationTokenGenerator } from "./invitation-token";

type IssueInvitationUseCaseOptions = {
  clock: Clock;
  ids: AccountInvitationIds;
  invitations: Pick<AccountInvitations, "insert">;
  tokenGenerator: InvitationTokenGenerator;
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
