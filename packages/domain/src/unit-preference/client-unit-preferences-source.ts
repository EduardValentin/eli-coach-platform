import type { UnitPreference } from "./unit-preference";

export interface ClientUnitPreferencesSource {
  findByClientId(clientId: string): Promise<UnitPreference | null>;
}
