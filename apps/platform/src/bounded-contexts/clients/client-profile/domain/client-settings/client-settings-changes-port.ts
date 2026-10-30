import type { ClientSettings } from "./client-settings";

export interface ClientSettingsChangesPort {
  saveUnits(settings: ClientSettings): Promise<void>;
}
