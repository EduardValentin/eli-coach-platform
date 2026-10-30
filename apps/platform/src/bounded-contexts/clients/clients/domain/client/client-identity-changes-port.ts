import type { ClientIdentityEdit } from "./client-identity-edit";

export interface ClientIdentityChangesPort {
  save(edit: ClientIdentityEdit): Promise<void>;
}
