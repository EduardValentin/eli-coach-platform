import type { AccountInvitationsPort } from "./account-invitations-port";
import type { ClientInvitationStanding } from "./client-invitation";
import type { InvitedClientsPort } from "./invited-clients-port";

type ReadClientInvitationUseCaseOptions = {
  accountInvitationsPort: Pick<AccountInvitationsPort, "standingOf">;
  invitedClientsPort: Pick<InvitedClientsPort, "findById">;
};

export class ReadClientInvitationUseCase {
  constructor(private readonly options: ReadClientInvitationUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientInvitationStanding | null> {
    const client = await this.options.invitedClientsPort.findById(clientId);

    if (!client?.accountInvitationId) {
      return null;
    }

    return this.options.accountInvitationsPort.standingOf(
      client.accountInvitationId,
    );
  }
}
