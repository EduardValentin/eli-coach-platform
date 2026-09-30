import type { VisitorGender } from "../assessment-call";

export type ClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  country: string;
  phone: string | null;
};

export interface ClientIdentities {
  findByClientId(clientId: string): Promise<ClientIdentity | null>;
}
