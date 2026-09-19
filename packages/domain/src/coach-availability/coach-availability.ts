import type { SlotPolicy } from "./slot-policy";
import type { TimeInterval } from "./time-interval";
import {
  addDays,
  compareCalendarDates,
  instantToWallClock,
  wallClockToInstant,
  weekdayIndexOf,
  type CalendarDate,
  type WallClock,
} from "./zoned-time";

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

const MINUTES_PER_HOUR = 60;

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
    assertConfiguredTimeZone(props.timeZone);
    assertConfiguredHours(props.startHour, props.endHour);
    assertConfiguredWeekdays(props.weekdays);

    return new CoachAvailability(props);
  }

  openSlotStarts(options: {
    now: Date;
    policy: SlotPolicy;
    busy: readonly TimeInterval[];
  }): Date[] {
    const { now, policy, busy } = options;

    return this.startsWithinHorizon(now, policy).filter(
      (start) =>
        this.isOpenStart({ start, now, policy }) &&
        !overlapsAny(policy.coachTimeFrom(start), busy),
    );
  }

  isOpenStart(options: {
    start: Date;
    now: Date;
    policy: SlotPolicy;
  }): boolean {
    const { start, now, policy } = options;
    const wallClock = instantToWallClock(start, this.timeZone);

    return (
      this.fitsTheWindow({ wallClock, policy }) &&
      this.isStepStart({ start, wallClock, policy }) &&
      this.isAvailableWeekday(wallClock) &&
      this.isWithinHorizon({ date: wallClock, now, policy }) &&
      isBeyondLeadTime({ start, now, policy })
    );
  }

  private startsWithinHorizon(now: Date, policy: SlotPolicy): Date[] {
    const today = instantToWallClock(now, this.timeZone);
    const starts: Date[] = [];

    for (let dayOffset = 0; dayOffset <= policy.horizonDays; dayOffset += 1) {
      starts.push(...this.startsOn(addDays(today, dayOffset), policy));
    }

    return starts;
  }

  private startsOn(date: CalendarDate, policy: SlotPolicy): Date[] {
    const starts: Date[] = [];

    for (
      let minuteOfDay = this.windowStartMinute();
      minuteOfDay + policy.durationMinutes <= this.windowEndMinute();
      minuteOfDay += policy.stepMinutes
    ) {
      starts.push(
        wallClockToInstant({
          timeZone: this.timeZone,
          ...date,
          hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
          minute: minuteOfDay % MINUTES_PER_HOUR,
        }),
      );
    }

    return starts;
  }

  private fitsTheWindow(options: {
    wallClock: WallClock;
    policy: SlotPolicy;
  }): boolean {
    const start = minuteOfDayOf(options.wallClock);

    return (
      start >= this.windowStartMinute() &&
      start + options.policy.durationMinutes <= this.windowEndMinute()
    );
  }

  private isStepStart(options: {
    start: Date;
    wallClock: WallClock;
    policy: SlotPolicy;
  }): boolean {
    const { start, wallClock, policy } = options;
    const minutesIntoWindow =
      minuteOfDayOf(wallClock) - this.windowStartMinute();

    return (
      start.getMilliseconds() === 0 &&
      wallClock.second === 0 &&
      minutesIntoWindow % policy.stepMinutes === 0
    );
  }

  private windowStartMinute(): number {
    return this.startHour * MINUTES_PER_HOUR;
  }

  private windowEndMinute(): number {
    return this.endHour * MINUTES_PER_HOUR;
  }

  private isAvailableWeekday(date: CalendarDate): boolean {
    return this.weekdays.includes(WEEKDAYS[weekdayIndexOf(date)]);
  }

  private isWithinHorizon(options: {
    date: CalendarDate;
    now: Date;
    policy: SlotPolicy;
  }): boolean {
    const lastDate = addDays(
      instantToWallClock(options.now, this.timeZone),
      options.policy.horizonDays,
    );

    return compareCalendarDates(options.date, lastDate) <= 0;
  }
}

function minuteOfDayOf(wallClock: WallClock): number {
  return wallClock.hour * MINUTES_PER_HOUR + wallClock.minute;
}

function isBeyondLeadTime(options: {
  start: Date;
  now: Date;
  policy: SlotPolicy;
}): boolean {
  return (
    options.start.getTime() - options.now.getTime() >=
    options.policy.leadMilliseconds()
  );
}

function overlapsAny(
  interval: TimeInterval,
  busy: readonly TimeInterval[],
): boolean {
  return busy.some(
    (taken) =>
      interval.start.getTime() < taken.end.getTime() &&
      taken.start.getTime() < interval.end.getTime(),
  );
}

function assertConfiguredTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
  } catch {
    throw new Error(
      "Coach availability needs a time zone the platform can format, such as Europe/Bucharest.",
    );
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
