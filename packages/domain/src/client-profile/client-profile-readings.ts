import type { ClientIdentities, ClientIdentity } from "../client";
import type {
  ClientPreferences,
  ClientSettingsSource,
} from "../client-settings";
import {
  earliestMeasurementOf,
  latestMeasurementOf,
  type ClientMeasurementsSource,
} from "../measurement";

import type { ClientAvatars } from "./client-avatars";
import type { ClientProfiles } from "./client-profiles";
import type { CoachingFactsSnapshot } from "./coaching-facts";

export type ClientProfileReading = {
  identity: ClientIdentity;
  coaching: CoachingFactsSnapshot | null;
  coachNotes: string | null;
  settings: ClientPreferences;
  hasAvatar: boolean;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
};

export type ClientProfileReadingPorts = {
  identities: Pick<ClientIdentities, "findByClientId">;
  profiles: Pick<ClientProfiles, "findByClientId">;
  settings: ClientSettingsSource;
  avatars: Pick<ClientAvatars, "findByClientId">;
  measurements: ClientMeasurementsSource;
};

export class ClientProfileReadings {
  constructor(private readonly ports: ClientProfileReadingPorts) {}

  async of(clientId: string): Promise<ClientProfileReading | null> {
    const identity = await this.ports.identities.findByClientId(clientId);

    if (!identity) {
      return null;
    }

    const [profile, settings, avatar, measurements] = await Promise.all([
      this.ports.profiles.findByClientId(clientId),
      this.ports.settings.findByClientId(clientId),
      this.ports.avatars.findByClientId(clientId),
      this.ports.measurements.listByClientId(clientId),
    ]);
    const stored = profile?.toSnapshot();
    const preferences = settings?.toSnapshot();

    return {
      identity,
      coaching: stored?.coaching ?? null,
      coachNotes: stored?.coachNotes ?? null,
      settings: {
        preferredCheckInWeekday: preferences?.preferredCheckInWeekday ?? null,
        preferredChannel: preferences?.preferredChannel ?? null,
      },
      hasAvatar: avatar !== null,
      startingWeightKg: earliestMeasurementOf(measurements)?.weightKg ?? null,
      currentWeightKg: latestMeasurementOf(measurements)?.weightKg ?? null,
    };
  }
}
