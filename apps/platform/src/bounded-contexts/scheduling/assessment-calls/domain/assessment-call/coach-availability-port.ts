import type { CoachTimeSpan } from "./coach-time-port";

export interface CoachAvailabilityReading {
  readonly timeZone: string;
  offersStart(question: { start: Date; now: Date }): boolean;
  openStarts(question: { now: Date; busy: readonly CoachTimeSpan[] }): Date[];
}

export interface CoachAvailabilityPort {
  current(): Promise<CoachAvailabilityReading>;
  busyFrom(from: Date): Promise<CoachTimeSpan[]>;
}
