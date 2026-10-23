import { addDays, differenceInCalendarDays, getDay, startOfDay } from 'date-fns';
import type { ClientJourney } from './journey';
import { WEEKDAYS, type Block, type Weekday } from './program';

const DAYS_PER_WEEK = 7;
const CHECKPOINT_INTERVAL_DAYS = 14;
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

export function currentPosition(blocks: readonly Block[], dayOne: Date | null, today: Date): PlanPosition {
  if (!dayOne) return { status: 'before' };
  const dayIndex = differenceInCalendarDays(today, dayOne);
  if (dayIndex < 0) return { status: 'before' };
  const totalWeeks = planWeeks(blocks);
  const weekOfPlan = Math.floor(dayIndex / DAYS_PER_WEEK) + 1;
  if (weekOfPlan > totalWeeks) return { status: 'ended' };
  const blockIndex = blocks.findIndex((_, index) => weekOfPlan <= blockSpan(blocks, index).endWeek);
  const weekOfBlock = weekOfPlan - blockSpan(blocks, blockIndex).startWeek + 1;
  return {
    status: 'in-plan',
    blockIndex,
    weekOfBlock,
    weekOfPlan,
    totalWeeks,
    calibration: weekOfBlock === 1 && blocks[blockIndex].calibrationWeek,
  };
}

export function jsDayOf(weekday: Weekday): number {
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
