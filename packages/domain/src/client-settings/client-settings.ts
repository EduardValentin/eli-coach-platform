import type { Weekday } from "../coach-availability";

import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

export const PREFERRED_CHANNELS = ["email", "whatsapp"] as const;

export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

export type ClientPreferences = {
  preferredCheckInWeekday: Weekday | null;
  preferredChannel: PreferredChannel | null;
};

export type ClientSettingsSnapshot = ClientPreferences & {
  clientId: string;
  unitPreference: UnitPreferenceSnapshot;
  updatedAt: Date;
};

type OpenedClientSettingsInput = {
  clientId: string;
  now: Date;
};

export class ClientSettings {
  private constructor(private readonly snapshot: ClientSettingsSnapshot) {}

  static opened(input: OpenedClientSettingsInput): ClientSettings {
    return new ClientSettings({
      clientId: input.clientId,
      unitPreference: UnitPreference.metric().toSnapshot(),
      preferredCheckInWeekday: null,
      preferredChannel: null,
      updatedAt: input.now,
    });
  }

  static reconstitute(snapshot: ClientSettingsSnapshot): ClientSettings {
    return new ClientSettings({
      ...snapshot,
      unitPreference: { ...snapshot.unitPreference },
    });
  }

  withUnits(preference: UnitPreference, now: Date): ClientSettings {
    return new ClientSettings({
      ...this.snapshot,
      unitPreference: preference.toSnapshot(),
      updatedAt: now,
    });
  }

  unitPreference(): UnitPreference {
    return UnitPreference.from(this.snapshot.unitPreference);
  }

  toSnapshot(): ClientSettingsSnapshot {
    return {
      ...this.snapshot,
      unitPreference: { ...this.snapshot.unitPreference },
    };
  }
}
