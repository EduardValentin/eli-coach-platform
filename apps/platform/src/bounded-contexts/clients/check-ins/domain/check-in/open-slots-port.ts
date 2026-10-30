import type { CoachTimeSpan } from "./coach-time-port";
import type { CoachWeek } from "./open-slots";

export interface OpenSlotsPort {
  coachWeek(): Promise<CoachWeek>;
  offersStart(question: { start: Date; now: Date }): Promise<boolean>;
  openStarts(now: Date): Promise<Date[]>;
  busyFrom(from: Date): Promise<CoachTimeSpan[]>;
}
