import type { AccountInvitations } from "./account-invitations";
import type { ClientInvitationStanding } from "./client-invitation";
import type { InvitedClients } from "./invited-client";

type ReadClientInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitations, "standingOf">;
  clients: Pick<InvitedClients, "findById">;
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
