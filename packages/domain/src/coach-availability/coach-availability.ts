import {
  addDays,
  compareCalendarDates,
  instantToWallClock,
  wallClockToInstant,
  weekdayIndexOf,
  type CalendarDate,
  type WallClock,
} from "./zoned-time";

export const ASSESSMENT_CALL_RULES = {
  durationMinutes: 30,
  bufferMinutes: 30,
  stepMinutes: 60,
  horizonDays: 30,
  leadMinutes: 120,
} as const;

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type CoachAvailabilityProps = {
  timeZone: string;
  weekdays: readonly Weekday[];
  startHour: number;
  endHour: number;
};

const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_STEP = ASSESSMENT_CALL_RULES.stepMinutes / MINUTES_PER_HOUR;
const LEAD_MS = ASSESSMENT_CALL_RULES.leadMinutes * MILLISECONDS_PER_MINUTE;

export class CoachAvailability {
  readonly timeZone: string;
  readonly weekdays: readonly Weekday[];
  readonly startHour: number;
  readonly endHour: number;

  private constructor(props: CoachAvailabilityProps) {
    this.timeZone = props.timeZone;
    this.weekdays = props.weekdays;
    this.startHour = props.startHour;
    this.endHour = props.endHour;
  }

  static configure(props: CoachAvailabilityProps): CoachAvailability {
    assertConfiguredHours(props.startHour, props.endHour);
    assertConfiguredWeekdays(props.weekdays);

    return new CoachAvailability(props);
  }

  openSlotStarts(options: {
    now: Date;
    reservedStarts: readonly Date[];
  }): Date[] {
    const reserved = new Set(
      options.reservedStarts.map((start) => start.getTime()),
    );

    return this.startsWithinHorizon(options.now).filter(
      (start) =>
        !reserved.has(start.getTime()) &&
        this.isOpenStart({ start, now: options.now }),
    );
  }

  isOpenStart(options: { start: Date; now: Date }): boolean {
    const wallClock = instantToWallClock(options.start, this.timeZone);

    return (
      this.isWindowHour(wallClock) &&
      this.isStepStart(options.start, wallClock) &&
      this.isAvailableWeekday(wallClock) &&
      this.isWithinHorizon(wallClock, options.now) &&
      this.isBeyondLeadTime(options.start, options.now)
    );
  }

  private startsWithinHorizon(now: Date): Date[] {
    const today = instantToWallClock(now, this.timeZone);
    const starts: Date[] = [];

    for (
      let dayOffset = 0;
      dayOffset <= ASSESSMENT_CALL_RULES.horizonDays;
      dayOffset += 1
    ) {
      starts.push(...this.startsOn(addDays(today, dayOffset)));
    }

    return starts;
  }

  private startsOn(date: CalendarDate): Date[] {
    const starts: Date[] = [];

    for (
      let hour = this.startHour;
      hour < this.endHour;
      hour += HOURS_PER_STEP
    ) {
      starts.push(
        wallClockToInstant({
          timeZone: this.timeZone,
          year: date.year,
          month: date.month,
          day: date.day,
          hour,
        }),
      );
    }

    return starts;
  }

  private isWindowHour(wallClock: WallClock): boolean {
    return wallClock.hour >= this.startHour && wallClock.hour < this.endHour;
  }

  private isStepStart(start: Date, wallClock: WallClock): boolean {
    return (
      start.getMilliseconds() === 0 &&
      wallClock.second === 0 &&
      wallClock.minute === 0 &&
      (wallClock.hour - this.startHour) % HOURS_PER_STEP === 0
    );
  }

  private isAvailableWeekday(date: CalendarDate): boolean {
    return this.weekdays.includes(WEEKDAYS[weekdayIndexOf(date)]);
  }

  private isWithinHorizon(date: CalendarDate, now: Date): boolean {
    const lastDate = addDays(
      instantToWallClock(now, this.timeZone),
      ASSESSMENT_CALL_RULES.horizonDays,
    );

    return compareCalendarDates(date, lastDate) <= 0;
  }

  private isBeyondLeadTime(start: Date, now: Date): boolean {
    return start.getTime() - now.getTime() >= LEAD_MS;
  }
}

function assertConfiguredHours(startHour: number, endHour: number): void {
  const configured =
    Number.isInteger(startHour) &&
    Number.isInteger(endHour) &&
    startHour >= 0 &&
    endHour <= 24 &&
    startHour < endHour;

  if (!configured) {
    throw new Error(
      "Coach availability hours must be whole hours from 0 to 24, with the start hour before the end hour.",
    );
  }
}

function assertConfiguredWeekdays(weekdays: readonly Weekday[]): void {
  const configured =
    weekdays.length > 0 &&
    weekdays.every((weekday) => WEEKDAYS.includes(weekday));

  if (!configured) {
    throw new Error("Coach availability needs at least one known weekday.");
  }
}
