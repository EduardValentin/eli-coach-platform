import type { CoachAvailability } from "./coach-availability";

export interface CoachAvailabilitySource {
  current(): Promise<CoachAvailability>;
}
