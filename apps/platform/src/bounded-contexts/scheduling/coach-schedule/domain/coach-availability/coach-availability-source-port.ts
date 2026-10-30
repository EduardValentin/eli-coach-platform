import type { CoachAvailability } from "./coach-availability";

export interface CoachAvailabilitySourcePort {
  current(): Promise<CoachAvailability>;
}
