import type { CoachAvailability } from "./coach-availability";

export interface CoachAvailabilityChangesPort {
  save(availability: CoachAvailability): Promise<void>;
}
