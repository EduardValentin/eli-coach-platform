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
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientId">;
  clientProfilesPort: Pick<ClientProfilesPort, "findByClientId">;
  clientSettingsSourcePort: ClientSettingsSourcePort;
  clientAvatarsPort: Pick<ClientAvatarsPort, "findByClientId">;
  clientMeasurementsSourcePort: ClientMeasurementsSourcePort;
};

export class ClientProfileComposite {
  constructor(private readonly ports: ClientProfileReadingPorts) {}

  async readFor(clientId: string): Promise<ClientProfileReading | null> {
    const identity =
      await this.ports.clientIdentitiesPort.findByClientId(clientId);

    if (!identity) {
      return null;
    }

    const [profile, settings, avatar, measurements] = await Promise.all([
      this.ports.clientProfilesPort.findByClientId(clientId),
      this.ports.clientSettingsSourcePort.findByClientId(clientId),
      this.ports.clientAvatarsPort.findByClientId(clientId),
      this.ports.clientMeasurementsSourcePort.listByClientId(clientId),
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
