import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitedClient, InvitedClientsPort } from "./invited-clients-port";

type InvitePaidClientResult =
  { status: "invited" } | { status: "already-admitted" };

type InvitePaidClientUseCaseOptions = {
  accountInvitations: Pick<AccountInvitationsPort, "issue" | "ensureDelivered">;
  clients: Pick<InvitedClientsPort, "findById" | "recordAccountInvitation">;
};

export class InvitePaidClientUseCase {
  constructor(private readonly options: InvitePaidClientUseCaseOptions) {}

  async execute(command: {
    clientId: string;
  }): Promise<InvitePaidClientResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      throw new Error(`Paid client ${command.clientId} does not exist.`);
    }

    if (client.authSubjectId) {
      return { status: "already-admitted" };
    }

    await this.options.accountInvitations.ensureDelivered({
      invitationId: await this.invitationIdOf(client),
      firstName: client.firstName,
    });

    return { status: "invited" };
  }

  private async invitationIdOf(client: InvitedClient): Promise<string> {
    if (client.accountInvitationId) {
      return client.accountInvitationId;
    }

    const { invitationId } = await this.options.accountInvitations.issue({
      email: client.email,
    });

    await this.options.clients.recordAccountInvitation({
      clientId: client.id,
      invitationId,
    });

    return invitationId;
  }
}
