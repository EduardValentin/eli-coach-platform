import type { AccountInvitationsPort } from "./account-invitations-port";
import type { InvitedClient, InvitedClientsPort } from "./invited-clients-port";

type InvitationAcceptanceOutcome = "accepted" | "refused";

type AcceptInvitationUseCaseOptions = {
  accountInvitations: Pick<AccountInvitationsPort, "acceptedInvitationOf">;
  clients: Pick<
    InvitedClientsPort,
    "findById" | "findByAccountInvitationId" | "bindAuthSubject"
  >;
};

export class AcceptInvitationUseCase {
  constructor(private readonly options: AcceptInvitationUseCaseOptions) {}

  async execute(command: {
    authSubjectId: string;
  }): Promise<InvitationAcceptanceOutcome> {
    const invitationId =
      await this.options.accountInvitations.acceptedInvitationOf(
        command.authSubjectId,
      );

    if (!invitationId) {
      return "refused";
    }

    const client =
      await this.options.clients.findByAccountInvitationId(invitationId);

    if (!client) {
      return "refused";
    }

    return this.accept(client, command.authSubjectId);
  }

  private async accept(
    client: InvitedClient,
    authSubjectId: string,
  ): Promise<InvitationAcceptanceOutcome> {
    if (client.authSubjectId === authSubjectId) {
      return "accepted";
    }

    const write = await this.options.clients.bindAuthSubject({
      clientId: client.id,
      authSubjectId,
    });

    if (write === "bound") {
      return "accepted";
    }

    const winner = await this.options.clients.findById(client.id);

    return winner?.authSubjectId === authSubjectId ? "accepted" : "refused";
  }
}
