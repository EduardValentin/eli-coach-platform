import type { CoachAvailability } from "./coach-availability";

export interface CoachAvailabilityChanges {
  save(availability: CoachAvailability): Promise<void>;
}
