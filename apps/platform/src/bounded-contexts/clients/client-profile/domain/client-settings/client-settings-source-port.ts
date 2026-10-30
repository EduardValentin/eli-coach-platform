import type { ClientSettings } from "./client-settings";

export interface ClientSettingsSourcePort {
  findByClientId(clientId: string): Promise<ClientSettings | null>;
}
