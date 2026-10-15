import { TZDate } from '@date-fns/tz';

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function weekdayNamed(name: string | null): number | null {
  if (name === null) return null;
  const index = WEEKDAY_NAMES.findIndex(
    (weekday) => weekday.toLowerCase() === name.trim().toLowerCase(),
  );

  return index === -1 ? null : index;
}

export type WeeklyRule = { weekday: number; hour: number; timeZone: string };

export type SeriesBounds = { from: Date; until: Date };

export type CheckinSeries = WeeklyRule & {
  id: string;
  clientId: string;
  coversFrom: Date;
  coversUntil: Date;
  setUpAt: Date;
  changedAt: Date | null;
  stoppedAt: Date | null;
};

export type SeriesWindow = {
  now: Date;
  noticeMinutes: number;
  programStartsAt: Date;
  paidThrough: Date;
  coachingEndsAt?: Date;
};

const MINUTE_MS = 60 * 1000;

function later(first: Date, second: Date): Date {
  return first.getTime() >= second.getTime() ? first : second;
}

function earlier(first: Date, second: Date): Date {
  return first.getTime() <= second.getTime() ? first : second;
}

export function seriesBounds({
  now,
  noticeMinutes,
  programStartsAt,
  paidThrough,
  coachingEndsAt,
}: SeriesWindow): SeriesBounds | 'nothing_to_create' {
  const from = later(new Date(now.getTime() + noticeMinutes * MINUTE_MS), programStartsAt);
  const until = coachingEndsAt ? earlier(paidThrough, coachingEndsAt) : paidThrough;

  return from.getTime() < until.getTime() ? { from, until } : 'nothing_to_create';
}

export function weekStartsBetween(rule: WeeklyRule, { from, until }: SeriesBounds): Date[] {
  const firstDay = new TZDate(from.getTime(), rule.timeZone);
  const daysAhead = (rule.weekday - firstDay.getDay() + 7) % 7;
  const starts: Date[] = [];

  for (let week = 0; ; week += 1) {
    const start = new TZDate(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      firstDay.getDate() + daysAhead + week * 7,
      rule.hour,
      rule.timeZone,
    ).getTime();
    if (start >= until.getTime()) return starts;
    if (start >= from.getTime()) starts.push(new Date(start));
  }
}

export type SeriesWeeks = { series: CheckinSeries; starts: Date[] };

export type NewSeries = {
  id: string;
  clientId: string;
  rule: WeeklyRule;
  bounds: SeriesBounds;
  at: Date;
};

export function seriesSetUp({ id, clientId, rule, bounds, at }: NewSeries): SeriesWeeks {
  return {
    series: {
      ...rule,
      id,
      clientId,
      coversFrom: bounds.from,
      coversUntil: bounds.until,
      setUpAt: at,
      changedAt: null,
      stoppedAt: null,
    },
    starts: weekStartsBetween(rule, bounds),
  };
}

export type SeriesNotice = { now: Date; noticeMinutes: number };

export function remainingCover(
  series: CheckinSeries,
  { now, noticeMinutes }: SeriesNotice,
): SeriesBounds {
  const from = later(new Date(now.getTime() + noticeMinutes * MINUTE_MS), series.coversFrom);

  return { from, until: series.coversUntil };
}

export type SeriesChange = SeriesNotice & { rule: WeeklyRule };

export function seriesChangedTo(series: CheckinSeries, change: SeriesChange): SeriesWeeks {
  const { rule, now } = change;

  return {
    series: { ...series, ...rule, changedAt: now },
    starts: weekStartsBetween(rule, remainingCover(series, change)),
  };
}

export function seriesExtendedTo(series: CheckinSeries, until: Date): SeriesWeeks {
  return {
    series: { ...series, coversUntil: until },
    starts: weekStartsBetween(series, { from: series.coversUntil, until }),
  };
}

export function seriesStoppedAt(series: CheckinSeries, at: Date): CheckinSeries {
  return { ...series, stoppedAt: at };
}
