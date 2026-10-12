import {
  UnitPreference,
  type ClientUnitPreferencesSource,
} from "../unit-preference";

import { ClientOnboarding } from "./client-onboarding";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingParticipants } from "./onboarding-participants";

type ClientOnboardingReading = {
  onboarding: ClientOnboarding;
  unitPreference: UnitPreference;
};

type ReadClientOnboardingUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  onboardings: ClientOnboardingSource;
  unitPreferences: ClientUnitPreferencesSource;
};

export class ReadClientOnboardingUseCase {
  constructor(private readonly options: ReadClientOnboardingUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<ClientOnboardingReading | null> {
    const participant =
      await this.options.participants.byAuthSubjectId(authSubjectId);

    if (!participant) {
      return null;
    }

    const { client, identity } = participant;

    const [stored, unitPreference] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.unitPreferences.findByClientId(client.clientId),
    ]);

    return {
      onboarding: ClientOnboarding.reconstitute({
        client: identity,
        ...stored,
      }),
      unitPreference: unitPreference ?? UnitPreference.metric(),
    };
  }
}
