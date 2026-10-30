import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";

import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";

type OnboardingParticipant = {
  client: OnboardingClient;
  identity: ClientIdentity;
};

type OnboardingParticipantsOptions = {
  onboardingClientsPort: OnboardingClientsPort;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientId">;
};

export class OnboardingParticipants {
  constructor(private readonly options: OnboardingParticipantsOptions) {}

  async byAuthSubjectId(
    authSubjectId: string,
  ): Promise<OnboardingParticipant | null> {
    return this.withIdentity(
      await this.options.onboardingClientsPort.findByAuthSubjectId(
        authSubjectId,
      ),
    );
  }

  async byClientId(clientId: string): Promise<OnboardingParticipant | null> {
    return this.withIdentity(
      await this.options.onboardingClientsPort.findByClientId(clientId),
    );
  }

  private async withIdentity(
    client: OnboardingClient | null,
  ): Promise<OnboardingParticipant | null> {
    if (!client) {
      return null;
    }

    const identity = await this.options.clientIdentitiesPort.findByClientId(
      client.clientId,
    );

    return identity ? { client, identity } : null;
  }
}
