import type { CoachTimeSpan } from "./coach-time";

export interface CoachAvailabilityReading {
  readonly timeZone: string;
  offersStart(question: { start: Date; now: Date }): boolean;
  openStarts(question: { now: Date; busy: readonly CoachTimeSpan[] }): Date[];
}

export interface CoachAvailability {
  current(): Promise<CoachAvailabilityReading>;
  busyFrom(from: Date): Promise<CoachTimeSpan[]>;
}
