import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import type {
  ClientPreferences,
  ClientSettingsSourcePort,
} from "../client-settings";
import {
  earliestMeasurementOf,
  latestMeasurementOf,
  type ClientMeasurementsSourcePort,
} from "../measurement";

import type { ClientAvatarsPort } from "./client-avatars-port";
import type { ClientProfilesPort } from "./client-profiles-port";
import type { CoachingFactsSnapshot } from "./coaching-facts";

export type ClientProfileReading = {
  identity: ClientIdentity;
  coaching: CoachingFactsSnapshot | null;
  coachNotes: string | null;
  preferences: ClientPreferences;
  avatarId: string | null;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
};

export type ClientProfileReadingPorts = {
  identities: Pick<ClientIdentitiesPort, "findByClientId">;
  profiles: Pick<ClientProfilesPort, "findByClientId">;
  settings: ClientSettingsSourcePort;
  avatars: Pick<ClientAvatarsPort, "findByClientId">;
  measurements: ClientMeasurementsSourcePort;
};

export class ClientProfileComposite {
  constructor(private readonly ports: ClientProfileReadingPorts) {}

  async readFor(clientId: string): Promise<ClientProfileReading | null> {
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
    const chosen = settings?.toSnapshot();

    return {
      identity,
      coaching: stored?.coaching ?? null,
      coachNotes: stored?.coachNotes ?? null,
      preferences: {
        preferredCheckInWeekday: chosen?.preferredCheckInWeekday ?? null,
        preferredChannel: chosen?.preferredChannel ?? null,
      },
      avatarId: avatar?.toSnapshot().avatarId ?? null,
      startingWeightKg: earliestMeasurementOf(measurements)?.weightKg ?? null,
      currentWeightKg: latestMeasurementOf(measurements)?.weightKg ?? null,
    };
  }
}
