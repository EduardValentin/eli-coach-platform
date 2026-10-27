import type { TimeInterval } from "./time-interval";

export interface CoachCalendar {
  busyFrom(from: Date): Promise<TimeInterval[]>;
}
