export type CheckInPortalReach = "reachable" | "awaiting_onboarding" | "ended";

export type CheckInClient = {
  clientId: string;
  portal: CheckInPortalReach;
};

export type CheckInClientReference = CheckInClient & {
  bookingTimeZone: string;
};

export type CheckInClientIdentity = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface CheckInClients {
  findByAuthSubjectId(authSubjectId: string): Promise<CheckInClient | null>;
  findById(clientId: string): Promise<CheckInClientReference | null>;
  identitiesOf(clientIds: readonly string[]): Promise<CheckInClientIdentity[]>;
}
