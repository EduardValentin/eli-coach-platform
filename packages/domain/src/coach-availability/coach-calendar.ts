import type { BusyInterval } from "./busy-interval";

export interface CoachCalendar {
  busyFrom(from: Date): Promise<BusyInterval[]>;
}
