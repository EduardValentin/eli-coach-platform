import type { ClientIdentityEdit } from "./client-identity-edit";

export interface ClientIdentityChanges {
  save(edit: ClientIdentityEdit): Promise<void>;
}
