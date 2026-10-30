import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { OnboardingStandingsPort } from "~/bounded-contexts/clients/clients/public";

export class ClientsOnboardingClientsAdapter implements OnboardingClientsPort {
  constructor(private readonly standings: OnboardingStandingsPort) {}

  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null> {
    return this.standings.findByAuthSubjectId(authSubjectId);
  }

  findByClientId(clientId: string): Promise<OnboardingClient | null> {
    return this.standings.findByClientId(clientId);
  }
}
