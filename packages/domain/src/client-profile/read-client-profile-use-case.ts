import type { ClientIdentities, ClientIdentity } from "../client";
import {
  earliestMeasurementOf,
  latestMeasurementOf,
  type ClientMeasurementsSource,
} from "../measurement";

import type { OnboardingProfileFacts } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";

export type ClientProfileReading = {
  identity: ClientIdentity;
  facts: OnboardingProfileFacts | null;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
};

type ReadClientProfileUseCaseOptions = {
  identities: ClientIdentities;
  profiles: ClientProfiles;
  measurements: ClientMeasurementsSource;
};

export class ReadClientProfileUseCase {
  constructor(private readonly options: ReadClientProfileUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientProfileReading | null> {
    const identity = await this.options.identities.findByClientId(clientId);

    if (!identity) {
      return null;
    }

    const [profile, measurements] = await Promise.all([
      this.options.profiles.findByClientId(clientId),
      this.options.measurements.listByClientId(clientId),
    ]);

    return {
      identity,
      facts: profile?.facts() ?? null,
      startingWeightKg: earliestMeasurementOf(measurements)?.weightKg ?? null,
      currentWeightKg: latestMeasurementOf(measurements)?.weightKg ?? null,
    };
  }
}
