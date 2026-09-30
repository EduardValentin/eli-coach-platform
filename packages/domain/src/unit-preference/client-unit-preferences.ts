import type { ClientUnitPreferencesSource } from "./client-unit-preferences-source";
import type { UnitPreference } from "./unit-preference";

type SaveClientUnitPreference = {
  clientId: string;
  preference: UnitPreference;
  at: Date;
};

export interface ClientUnitPreferences extends ClientUnitPreferencesSource {
  save(input: SaveClientUnitPreference): Promise<void>;
}
