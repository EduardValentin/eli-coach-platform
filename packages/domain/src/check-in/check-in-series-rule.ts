import {
  addDays,
  instantToWallClock,
  wallClockToInstant,
  weekdayIndexOf,
  WEEKDAYS,
  type CalendarDate,
  type CoachAvailability,
  type TimeInterval,
  type Weekday,
} from "../coach-availability";

import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeriesBounds } from "./check-in-series-bounds";

export type CheckInSeriesRuleSnapshot = {
  weekday: Weekday;
  hour: number;
  timeZone: string;
};

export type CheckInSeriesPreviewHour = {
  hour: number;
  occurrences: number;
  clashes: number;
};

type CheckInSeriesWeekdayPreview = {
  weekday: Weekday;
  availability: CoachAvailability;
  bounds: CheckInSeriesBounds;
  busy: readonly TimeInterval[];
};

type CheckInSeriesHourPreview = {
  bounds: CheckInSeriesBounds;
  busy: readonly TimeInterval[];
};

const DAYS_PER_WEEK = 7;

export class CheckInSeriesRule {
  readonly weekday: Weekday;
  readonly hour: number;
  readonly timeZone: string;

  private constructor(snapshot: CheckInSeriesRuleSnapshot) {
    this.weekday = snapshot.weekday;
    this.hour = snapshot.hour;
    this.timeZone = snapshot.timeZone;
  }

  static of(snapshot: CheckInSeriesRuleSnapshot): CheckInSeriesRule {
    return new CheckInSeriesRule(snapshot);
  }

  static previewHoursOn({
    weekday,
    availability,
    bounds,
    busy,
  }: CheckInSeriesWeekdayPreview): CheckInSeriesPreviewHour[] {
    return availability.weeklyHours().map((hour) =>
      new CheckInSeriesRule({
        weekday,
        hour,
        timeZone: availability.timeZone,
      }).previewBetween({ bounds, busy }),
    );
  }

  startsBetween({ from, until }: CheckInSeriesBounds): Date[] {
    const starts: Date[] = [];

    for (
      let date = this.firstMatchingDateFrom(from);
      this.startOn(date) < until;
      date = addDays(date, DAYS_PER_WEEK)
    ) {
      const start = this.startOn(date);

      if (start >= from) {
        starts.push(start);
      }
    }

    return starts;
  }

  nextStartFrom(from: Date): Date {
    const date = this.firstMatchingDateFrom(from);
    const start = this.startOn(date);

    return start >= from ? start : this.startOn(addDays(date, DAYS_PER_WEEK));
  }

  toSnapshot(): CheckInSeriesRuleSnapshot {
    return { weekday: this.weekday, hour: this.hour, timeZone: this.timeZone };
  }

  private previewBetween(
    preview: CheckInSeriesHourPreview,
  ): CheckInSeriesPreviewHour {
    const starts = this.startsBetween(preview.bounds);

    return {
      hour: this.hour,
      occurrences: starts.length,
      clashes: starts.filter((start) => this.isTaken(start, preview.busy))
        .length,
    };
  }

  private firstMatchingDateFrom(from: Date): CalendarDate {
    const { year, month, day } = instantToWallClock(from, this.timeZone);
    const date = { year, month, day };
    const daysAhead =
      (WEEKDAYS.indexOf(this.weekday) - weekdayIndexOf(date) + DAYS_PER_WEEK) %
      DAYS_PER_WEEK;

    return addDays(date, daysAhead);
  }

  private startOn(date: CalendarDate): Date {
    return wallClockToInstant({
      timeZone: this.timeZone,
      ...date,
      hour: this.hour,
      minute: 0,
    });
  }

  private isTaken(start: Date, busy: readonly TimeInterval[]): boolean {
    const held = CHECK_IN_RULES.coachTimeFrom(start);

    return busy.some(
      (taken) => held.start < taken.end && taken.start < held.end,
    );
  }
}
