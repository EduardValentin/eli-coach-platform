import {
  DEFAULT_UNIT_PREFERENCE,
  type ClientUnitPreferences,
  type UnitPreference,
} from "../unit-preference";

import { ClientOnboarding } from "./client-onboarding";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingClients } from "./onboarding-clients";

type ClientOnboardingReading = {
  onboarding: ClientOnboarding;
  unitPreference: UnitPreference;
};

type ReadClientOnboardingUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  unitPreferences: ClientUnitPreferences;
};

export class ReadClientOnboardingUseCase {
  constructor(private readonly options: ReadClientOnboardingUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<ClientOnboardingReading | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const [stored, unitPreference] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.unitPreferences.findByClientId(client.clientId),
    ]);

    return {
      onboarding: ClientOnboarding.reconstitute({ client, ...stored }),
      unitPreference: unitPreference ?? DEFAULT_UNIT_PREFERENCE,
    };
  }
}
