import {
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";

import { ClientOnboarding } from "./client-onboarding";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { OnboardingParticipants } from "./onboarding-participants";

type ClientOnboardingReading = {
  onboarding: ClientOnboarding;
  unitPreference: UnitPreference;
};

type ReadClientOnboardingUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  onboardings: ClientOnboardingSourcePort;
  settings: ClientSettingsSourcePort;
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

    const [stored, settings] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.settings.findByClientId(client.clientId),
    ]);

    return {
      onboarding: ClientOnboarding.reconstitute({
        client: identity,
        ...stored,
      }),
      unitPreference: settings?.unitPreference() ?? UnitPreference.metric(),
    };
  }
}
