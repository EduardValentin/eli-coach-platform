import type { ClientIdentities, ClientIdentity } from "../client";

import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";

type OnboardingParticipant = {
  client: OnboardingClient;
  identity: ClientIdentity;
};

type OnboardingParticipantsOptions = {
  clients: OnboardingClients;
  identities: Pick<ClientIdentities, "findByClientId">;
};

export class OnboardingParticipants {
  constructor(private readonly options: OnboardingParticipantsOptions) {}

  async byAuthSubjectId(
    authSubjectId: string,
  ): Promise<OnboardingParticipant | null> {
    return this.withIdentity(
      await this.options.clients.findByAuthSubjectId(authSubjectId),
    );
  }

  async byClientId(clientId: string): Promise<OnboardingParticipant | null> {
    return this.withIdentity(
      await this.options.clients.findByClientId(clientId),
    );
  }

  private async withIdentity(
    client: OnboardingClient | null,
  ): Promise<OnboardingParticipant | null> {
    if (!client) {
      return null;
    }

    const identity = await this.options.identities.findByClientId(
      client.clientId,
    );

    return identity ? { client, identity } : null;
  }
}
