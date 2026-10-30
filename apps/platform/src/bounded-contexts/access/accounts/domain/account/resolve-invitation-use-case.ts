import type { ClockPort } from "../clock-port";

import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitationTokenHasherPort } from "./invitation-token-hasher-port";

type InvitationLandingResolution =
  { state: "valid"; signUpUrl: string } | { state: "unavailable" };

type ResolveInvitationUseCaseOptions = {
  clock: ClockPort;
  invitations: Pick<AccountInvitationsPort, "findByTokenHash">;
  tokenHasher: InvitationTokenHasherPort;
};

export class ResolveInvitationUseCase {
  constructor(private readonly options: ResolveInvitationUseCaseOptions) {}

  async execute(command: {
    rawToken: string;
  }): Promise<InvitationLandingResolution> {
    const invitation = await this.options.invitations.findByTokenHash(
      this.options.tokenHasher.sha256(command.rawToken),
    );

    if (
      !invitation?.provider ||
      !invitation.isPending(this.options.clock.now())
    ) {
      return { state: "unavailable" };
    }

    return { state: "valid", signUpUrl: invitation.provider.url };
  }
}
