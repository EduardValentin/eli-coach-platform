import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import type { OnboardingStandingsPort } from "~/bounded-contexts/clients/clients/public";

export class ClientsOnboardingClientsAdapter implements OnboardingClientsPort {
  constructor(
    private readonly onboardingStandingsPort: OnboardingStandingsPort,
  ) {}

  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null> {
    return this.onboardingStandingsPort.findByAuthSubjectId(authSubjectId);
  }

  findByClientId(clientId: string): Promise<OnboardingClient | null> {
    return this.onboardingStandingsPort.findByClientId(clientId);
  }
}
