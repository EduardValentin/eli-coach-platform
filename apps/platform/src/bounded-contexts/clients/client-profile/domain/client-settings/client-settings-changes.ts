import type { ClientSettings } from "./client-settings";

export interface ClientSettingsChanges {
  saveUnits(settings: ClientSettings): Promise<void>;
}
