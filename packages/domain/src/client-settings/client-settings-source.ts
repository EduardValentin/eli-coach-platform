import type { ClientSettings } from "./client-settings";

export interface ClientSettingsSource {
  findByClientId(clientId: string): Promise<ClientSettings | null>;
}
