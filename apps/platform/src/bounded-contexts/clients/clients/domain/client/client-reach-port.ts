import type { PortalReach } from "./portal-reach";

export type ClientReachReading = {
  clientId: string;
  portal: PortalReach;
  coachingEndsAt: Date | null;
  programStartsAt: Date | null;
  paidThrough: Date | null;
  timeZone: string;
};

export interface ClientReachPort {
  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null>;
  findById(clientId: string): Promise<ClientReachReading | null>;
}
