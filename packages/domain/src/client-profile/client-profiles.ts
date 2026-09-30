import type { ClientProfile } from "./client-profile";

export interface ClientProfiles {
  findByClientId(clientId: string): Promise<ClientProfile | null>;
}
