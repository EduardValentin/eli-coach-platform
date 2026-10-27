export type ClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: "female" | "male" | "prefer_not_to_say";
  country: string;
  phone: string | null;
};

export interface ClientIdentities {
  findByClientId(clientId: string): Promise<ClientIdentity | null>;
  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]>;
}
