import { addDays, differenceInCalendarDays, getDay, startOfDay } from 'date-fns';
import type { ClientJourney } from './journey';
import { WEEKDAYS, type Block, type Weekday } from './program';

const DAYS_PER_WEEK = 7;
const CHECKPOINT_INTERVAL_DAYS = 14;
export const CHECK_IN_INTERVAL_WEEKS = CHECKPOINT_INTERVAL_DAYS / DAYS_PER_WEEK;
const JS_DAY_TO_WEEKDAY: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DEFAULT_CHECK_IN_WEEKDAY: Weekday = 'mon';

export type PlanSchedule = { blocks: readonly Block[]; dayOne: Date | null; today: Date };

export type PlanPosition =
  | { status: 'before' }
  | { status: 'ended' }
  | {
      status: 'in-plan';
      blockIndex: number;
      weekOfBlock: number;
      weekOfPlan: number;
      totalWeeks: number;
      calibration: boolean;
    };

export function planWeeks(blocks: readonly Block[]): number {
  return blocks.reduce((total, block) => total + block.weeks, 0);
}

export function blockSpan(blocks: readonly Block[], index: number): { startWeek: number; endWeek: number } {
  const weeksBefore = planWeeks(blocks.slice(0, index));
  return { startWeek: weeksBefore + 1, endWeek: weeksBefore + blocks[index].weeks };
}

export function blockDates(blocks: readonly Block[], index: number, dayOne: Date): { start: Date; end: Date } {
  const { startWeek, endWeek } = blockSpan(blocks, index);
  const planStart = startOfDay(dayOne);
  return {
    start: addDays(planStart, (startWeek - 1) * DAYS_PER_WEEK),
    end: addDays(planStart, endWeek * DAYS_PER_WEEK - 1),
  };
}

export type WeekInPlan = { blockIndex: number; weekOfBlock: number; calibration: boolean };

export function weekInPlan(blocks: readonly Block[], weekOfPlan: number): WeekInPlan {
  const blockIndex = blocks.findIndex((_, index) => weekOfPlan <= blockSpan(blocks, index).endWeek);
  const weekOfBlock = weekOfPlan - blockSpan(blocks, blockIndex).startWeek + 1;
  return { blockIndex, weekOfBlock, calibration: weekOfBlock === 1 && blocks[blockIndex].calibrationWeek };
}

export function currentPosition(blocks: readonly Block[], dayOne: Date | null, today: Date): PlanPosition {
  if (!dayOne) return { status: 'before' };
  const dayIndex = differenceInCalendarDays(today, dayOne);
  if (dayIndex < 0) return { status: 'before' };
  const totalWeeks = planWeeks(blocks);
  const weekOfPlan = Math.floor(dayIndex / DAYS_PER_WEEK) + 1;
  if (weekOfPlan > totalWeeks) return { status: 'ended' };
  return { status: 'in-plan', ...weekInPlan(blocks, weekOfPlan), weekOfPlan, totalWeeks };
}

export function weeklyRuleWeekdayOf(weekday: Weekday): number {
  return JS_DAY_TO_WEEKDAY.indexOf(weekday);
}

export function weekdayOf(date: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[getDay(date)];
}

export function checkpointDate(dayOne: Date, preferred: Weekday, n: number): Date {
  const earliest = addDays(startOfDay(dayOne), CHECKPOINT_INTERVAL_DAYS * n);
  const offset = (WEEKDAYS.indexOf(preferred) - WEEKDAYS.indexOf(weekdayOf(earliest)) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(earliest, offset);
}

export function nextCheckpoint(dayOne: Date, preferred: Weekday, today: Date): Date {
  const from = startOfDay(today);
  let n = 1;
  while (checkpointDate(dayOne, preferred, n) < from) n += 1;
  return checkpointDate(dayOne, preferred, n);
}

export function checkpointsWithin(dayOne: Date, preferred: Weekday, until: Date): Date[] {
  const limit = startOfDay(until);
  const checkpoints: Date[] = [];
  for (let n = 1; checkpointDate(dayOne, preferred, n) <= limit; n += 1) {
    checkpoints.push(checkpointDate(dayOne, preferred, n));
  }
  return checkpoints;
}

type BlockDay = { weekday: Weekday; date: Date | null; checkIn: boolean };
type BlockWeek = { week: number; days: BlockDay[] };
type BlockSchedule = Pick<PlanSchedule, 'blocks' | 'dayOne'>;

function blockWeeks({ blocks, dayOne }: BlockSchedule, index: number, checkInWeekday: Weekday): BlockWeek[] {
  const weekNumbers = Array.from({ length: blocks[index].weeks }, (_, offset) => offset + 1);
  if (!dayOne) {
    return weekNumbers.map(week => ({ week, days: WEEKDAYS.map(weekday => ({ weekday, date: null, checkIn: false })) }));
  }
  const { start, end } = blockDates(blocks, index, dayOne);
  const checkIns = new Set(checkpointsWithin(dayOne, checkInWeekday, end).map(date => date.getTime()));
  return weekNumbers.map(week => ({
    week,
    days: Array.from({ length: DAYS_PER_WEEK }, (_, day) => {
      const date = addDays(start, (week - 1) * DAYS_PER_WEEK + day);
      return { weekday: weekdayOf(date), date, checkIn: checkIns.has(date.getTime()) };
    }),
  }));
}

export function daysUntil(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

export function checkInWeekdayOf(journey: ClientJourney | null): Weekday {
  return journey?.settings.preferredCheckInWeekday ?? DEFAULT_CHECK_IN_WEEKDAY;
}

export function dayOneOf(journey: ClientJourney | null): Date | null {
  return journey?.programReadyAt ?? null;
}

export type BlockStatus =
  | { kind: 'ended'; end: Date }
  | { kind: 'current'; weekOfBlock: number; calibration: boolean }
  | { kind: 'upcoming'; start: Date | null };

export function blockStatus({ blocks, dayOne, today }: PlanSchedule, index: number): BlockStatus {
  if (!dayOne) return { kind: 'upcoming', start: null };
  const { start, end } = blockDates(blocks, index, dayOne);
  if (end < startOfDay(today)) return { kind: 'ended', end };
  const position = currentPosition(blocks, dayOne, today);
  if (position.status === 'in-plan' && position.blockIndex === index) {
    return { kind: 'current', weekOfBlock: position.weekOfBlock, calibration: position.calibration };
  }
  return { kind: 'upcoming', start };
}

export type PlanWeek = WeekInPlan & { weekOfPlan: number; days: BlockDay[] };

export function planWeek(schedule: BlockSchedule, weekOfPlan: number, checkInWeekday: Weekday): PlanWeek {
  const week = weekInPlan(schedule.blocks, weekOfPlan);
  return { weekOfPlan, ...week, days: blockWeeks(schedule, week.blockIndex, checkInWeekday)[week.weekOfBlock - 1].days };
}

export type DateRange = { start: Date; end: Date };

export function weekRangeOf(days: readonly { date: Date | null }[]): DateRange | null {
  const start = days[0]?.date;
  const end = days.at(-1)?.date;
  return start && end ? { start, end } : null;
}

export function shownWeekOfPlan(blocks: readonly Block[], position: PlanPosition): number {
  if (position.status === 'in-plan') return position.weekOfPlan;
  return position.status === 'ended' ? planWeeks(blocks) : 1;
}
