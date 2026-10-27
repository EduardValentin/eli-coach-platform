type PortalReach = "reachable" | "awaiting_onboarding" | "ended";

export type ClientReachReading = {
  clientId: string;
  portal: PortalReach;
  coachingEndsAt: Date | null;
  programStartsAt: Date | null;
  paidThrough: Date | null;
  timeZone: string;
};

export interface ClientReach {
  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null>;
  findById(clientId: string): Promise<ClientReachReading | null>;
}
