import type { UnitPreference } from "./unit-preference";

type SaveClientUnitPreference = {
  clientId: string;
  preference: UnitPreference;
  at: Date;
};

export interface ClientUnitPreferences {
  findByClientId(clientId: string): Promise<UnitPreference | null>;
  save(input: SaveClientUnitPreference): Promise<void>;
}
