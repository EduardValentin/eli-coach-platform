import { describe, expect, it } from 'vitest';
import type { Block } from './program';
import {
  blockDates,
  blockSpan,
  blockStatus,
  checkpointDate,
  checkpointsWithin,
  currentPosition,
  daysUntil,
  nextCheckpoint,
  planWeeks,
  weekdayFromOnboarding,
  weekdayOf,
} from './programCalendar';

const blockOf = (weeks: number, calibrationWeek: boolean) => ({ weeks, calibrationWeek }) as Block;
const blocks = [blockOf(4, false), blockOf(6, true), blockOf(1, false)];
const dayOne = new Date(2026, 8, 16);

describe('plan layout', () => {
  it('sums block weeks', () => {
    expect(planWeeks(blocks)).toBe(11);
    expect(planWeeks([])).toBe(0);
  });

  it('gives each block a 1-based inclusive week span', () => {
    expect(blockSpan(blocks, 0)).toEqual({ startWeek: 1, endWeek: 4 });
    expect(blockSpan(blocks, 1)).toEqual({ startWeek: 5, endWeek: 10 });
    expect(blockSpan(blocks, 2)).toEqual({ startWeek: 11, endWeek: 11 });
  });

  it('gives each block start and end dates', () => {
    expect(blockDates(blocks, 1, dayOne)).toEqual({ start: new Date(2026, 9, 14), end: new Date(2026, 10, 24) });
    expect(blockDates(blocks, 0, dayOne)).toEqual({ start: new Date(2026, 8, 16), end: new Date(2026, 9, 13) });
  });
});

describe('currentPosition', () => {
  it('stays in week 1 until day 7 ends', () => {
    expect(currentPosition(blocks, dayOne, new Date(2026, 8, 22))).toEqual({
      status: 'in-plan',
      blockIndex: 0,
      weekOfBlock: 1,
      weekOfPlan: 1,
      totalWeeks: 11,
      calibration: false,
    });
  });

  it('moves to week 2 on day 8', () => {
    expect(currentPosition(blocks, dayOne, new Date(2026, 8, 23))).toMatchObject({ weekOfBlock: 2, weekOfPlan: 2 });
  });

  it('flags the calibration week of a block that has one', () => {
    expect(currentPosition(blocks, dayOne, new Date(2026, 9, 14))).toMatchObject({
      status: 'in-plan',
      blockIndex: 1,
      weekOfBlock: 1,
      weekOfPlan: 5,
      calibration: true,
    });
    expect(currentPosition(blocks, dayOne, new Date(2026, 9, 21))).toMatchObject({ weekOfBlock: 2, calibration: false });
  });

  it('is in the last week on the last day and ended after it', () => {
    expect(currentPosition(blocks, dayOne, new Date(2026, 11, 1))).toMatchObject({ status: 'in-plan', weekOfPlan: 11 });
    expect(currentPosition(blocks, dayOne, new Date(2026, 11, 2))).toEqual({ status: 'ended' });
  });

  it('is before without a day 1 or when today precedes it', () => {
    expect(currentPosition(blocks, null, new Date(2026, 8, 22))).toEqual({ status: 'before' });
    expect(currentPosition(blocks, dayOne, new Date(2026, 8, 15))).toEqual({ status: 'before' });
  });

  it('ignores the time of day', () => {
    expect(currentPosition(blocks, dayOne, new Date(2026, 8, 22, 23, 59))).toMatchObject({ weekOfPlan: 1 });
  });
});

describe('weekdayOf', () => {
  it('starts the week on Monday', () => {
    expect(weekdayOf(new Date(2026, 8, 14))).toBe('mon');
    expect(weekdayOf(new Date(2026, 8, 16))).toBe('wed');
    expect(weekdayOf(new Date(2026, 8, 20))).toBe('sun');
  });
});

describe('checkpoints', () => {
  it('lands on the preferred weekday on or after day 1 + 14n', () => {
    expect(checkpointDate(dayOne, 'mon', 1)).toEqual(new Date(2026, 9, 5));
    expect(checkpointDate(dayOne, 'mon', 2)).toEqual(new Date(2026, 9, 19));
    expect(checkpointDate(dayOne, 'wed', 1)).toEqual(new Date(2026, 8, 30));
  });

  it('finds the next checkpoint on or after today', () => {
    expect(nextCheckpoint(dayOne, 'mon', new Date(2026, 9, 5))).toEqual(new Date(2026, 9, 5));
    expect(nextCheckpoint(dayOne, 'mon', new Date(2026, 9, 6))).toEqual(new Date(2026, 9, 19));
    expect(nextCheckpoint(dayOne, 'mon', new Date(2026, 8, 16))).toEqual(new Date(2026, 9, 5));
  });

  it('lists checkpoints up to and including a date', () => {
    expect(checkpointsWithin(dayOne, 'mon', new Date(2026, 9, 19))).toEqual([new Date(2026, 9, 5), new Date(2026, 9, 19)]);
    expect(checkpointsWithin(dayOne, 'mon', new Date(2026, 9, 4))).toEqual([]);
  });
});

describe('daysUntil', () => {
  it('counts calendar days both ways', () => {
    expect(daysUntil(new Date(2026, 8, 16), new Date(2026, 8, 23))).toBe(7);
    expect(daysUntil(new Date(2026, 8, 23), new Date(2026, 8, 16))).toBe(-7);
    expect(daysUntil(new Date(2026, 8, 16, 18), new Date(2026, 8, 17, 6))).toBe(1);
  });

  it('is exact across the October daylight saving change', () => {
    expect(daysUntil(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
  });
});

describe('weekdayFromOnboarding', () => {
  it('maps full English names', () => {
    expect(weekdayFromOnboarding('Monday')).toBe('mon');
    expect(weekdayFromOnboarding('Sunday')).toBe('sun');
    expect(weekdayFromOnboarding('Thursday')).toBe('thu');
  });

  it('defaults to Monday', () => {
    expect(weekdayFromOnboarding(null)).toBe('mon');
    expect(weekdayFromOnboarding('Someday')).toBe('mon');
  });
});

describe('blockStatus', () => {
  it('treats every block as upcoming before day 1 is known', () => {
    expect(blockStatus({ blocks, dayOne: null, today: new Date(2026, 8, 20) }, 0)).toEqual({ kind: 'upcoming', start: null });
  });

  it('marks ended, current and upcoming blocks from day 1', () => {
    const today = new Date(2026, 9, 21);
    expect(blockStatus({ blocks, dayOne, today }, 0)).toEqual({ kind: 'ended', end: new Date(2026, 9, 13) });
    expect(blockStatus({ blocks, dayOne, today }, 1)).toEqual({ kind: 'current', weekOfBlock: 2, calibration: false });
    expect(blockStatus({ blocks, dayOne, today }, 2)).toEqual({ kind: 'upcoming', start: new Date(2026, 10, 25) });
  });
});
