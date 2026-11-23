export type ClientGender = "female" | "male" | "prefer_not_to_say";

export type ClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  gender: ClientGender;
};

export interface ClientIdentityPort {
  find(clientId: string): Promise<ClientIdentity | null>;
}
