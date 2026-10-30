import type { Weekday } from "./weekdays";

export type CoachWeekSnapshot = {
  timeZone: string;
  weekdays: readonly Weekday[];
  hours: readonly number[];
};

export class CoachWeek {
  readonly timeZone: string;
  readonly weekdays: readonly Weekday[];
  readonly hours: readonly number[];

  private constructor(snapshot: CoachWeekSnapshot) {
    this.timeZone = snapshot.timeZone;
    this.weekdays = snapshot.weekdays;
    this.hours = snapshot.hours;
  }

  static of(snapshot: CoachWeekSnapshot): CoachWeek {
    return new CoachWeek(snapshot);
  }

  holdsWeeklyHour(weekly: { weekday: Weekday; hour: number }): boolean {
    return (
      this.weekdays.includes(weekly.weekday) && this.hours.includes(weekly.hour)
    );
  }
}
