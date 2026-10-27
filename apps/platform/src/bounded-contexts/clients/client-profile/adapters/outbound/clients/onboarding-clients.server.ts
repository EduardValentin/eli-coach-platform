import type {
  OnboardingClient,
  OnboardingClients,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { OnboardingStandings } from "~/bounded-contexts/clients/clients/public";

export class ClientsOnboardingClients implements OnboardingClients {
  constructor(private readonly standings: OnboardingStandings) {}

  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null> {
    return this.standings.findByAuthSubjectId(authSubjectId);
  }

  findByClientId(clientId: string): Promise<OnboardingClient | null> {
    return this.standings.findByClientId(clientId);
  }
}
