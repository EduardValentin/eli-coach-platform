import type { ClockPort } from "../clock-port";

import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationTokenHasherPort } from "./invitation-token-hasher-port";

type InvitationLandingResolution =
  { state: "valid"; signUpUrl: string } | { state: "unavailable" };

type ResolveInvitationUseCaseOptions = {
  clockPort: ClockPort;
  accountInvitationsPort: Pick<AccountInvitationsPort, "findByTokenHash">;
  invitationTokenHasherPort: InvitationTokenHasherPort;
};

export class ResolveInvitationUseCase {
  constructor(private readonly options: ResolveInvitationUseCaseOptions) {}

  async execute(command: {
    rawToken: string;
  }): Promise<InvitationLandingResolution> {
    const invitation =
      await this.options.accountInvitationsPort.findByTokenHash(
        this.options.invitationTokenHasherPort.sha256(command.rawToken),
      );

    if (
      !invitation?.provider ||
      !invitation.isPending(this.options.clockPort.now())
    ) {
      return { state: "unavailable" };
    }

    return { state: "valid", signUpUrl: invitation.provider.url };
  }
}
