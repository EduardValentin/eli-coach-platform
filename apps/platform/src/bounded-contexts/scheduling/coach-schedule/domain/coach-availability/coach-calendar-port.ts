import type { TimeInterval } from "./time-interval";

export interface CoachCalendarPort {
  busyFrom(from: Date): Promise<TimeInterval[]>;
}
