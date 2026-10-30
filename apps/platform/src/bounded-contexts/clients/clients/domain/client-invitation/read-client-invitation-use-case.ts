import type { AccountInvitationsPort } from "./account-invitations-port";
import type { ClientInvitationStanding } from "./client-invitation";
import type { InvitedClientsPort } from "./invited-clients-port";

type ReadClientInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitationsPort, "standingOf">;
  clients: Pick<InvitedClientsPort, "findById">;
};

export class ReadClientInvitationUseCase {
  constructor(private readonly options: ReadClientInvitationUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientInvitationStanding | null> {
    const client = await this.options.clients.findById(clientId);

    if (!client?.accountInvitationId) {
      return null;
    }

    return this.options.accountInvitations.standingOf(
      client.accountInvitationId,
    );
  }
}
