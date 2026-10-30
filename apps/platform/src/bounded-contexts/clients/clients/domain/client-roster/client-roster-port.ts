import type { ClientRosterEntry } from "./client-roster";

export interface ClientRosterPort {
  list(): Promise<ClientRosterEntry[]>;
  findById(clientId: string): Promise<ClientRosterEntry | null>;
}
