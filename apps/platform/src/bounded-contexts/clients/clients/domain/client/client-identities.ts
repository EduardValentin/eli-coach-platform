import type { VisitorGender } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

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
  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]>;
}
