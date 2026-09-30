import type { Clock } from "../shared";

import type { ClientInvitations } from "./client-invitations";
import type { InvitationTokenHasher } from "./invitation-token";

type InvitationLandingResolution =
  { state: "valid"; signUpUrl: string } | { state: "unavailable" };

type ResolveInvitationUseCaseOptions = {
  clock: Clock;
  invitations: ClientInvitations;
  tokenHasher: InvitationTokenHasher;
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
