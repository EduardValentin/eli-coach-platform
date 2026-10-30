import type { ClientGender } from "./client-details";

export type ClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: ClientGender;
  country: string;
  phone: string | null;
};

export interface ClientIdentitiesPort {
  findByClientId(clientId: string): Promise<ClientIdentity | null>;
  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]>;
}
