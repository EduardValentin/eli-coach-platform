export type CheckInClient = {
  clientId: string;
  portal: "reachable" | "unreachable";
};

export type CheckInClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface CheckInClients {
  findByAuthSubjectId(authSubjectId: string): Promise<CheckInClient | null>;
  identitiesOf(clientIds: readonly string[]): Promise<CheckInClientIdentity[]>;
}
