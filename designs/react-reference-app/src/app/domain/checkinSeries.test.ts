import { describe, expect, it } from 'vitest';
import {
  seriesBounds,
  seriesChangedTo,
  seriesExtendedTo,
  seriesSetUp,
  seriesStoppedAt,
  weekStartsBetween,
  weekdayNamed,
  type SeriesBounds,
  type WeeklyRule,
} from './checkinSeries';

const ZONE = 'Europe/Bucharest';
const NOTICE_MINUTES = 24 * 60;
const WEDNESDAY_AT_SIX: WeeklyRule = { weekday: 3, hour: 18, timeZone: ZONE };

function isoStarts(starts: Date[]): string[] {
  return starts.map((start) => start.toISOString());
}

describe('the weeks of a weekly check-in', () => {
  it('keeps the coach’s local hour when Bucharest leaves summer time', () => {
    // arrange
    const bounds: SeriesBounds = {
      from: new Date('2026-10-13T00:00:00.000Z'),
      until: new Date('2026-11-06T00:00:00.000Z'),
    };

    // act
    const starts = weekStartsBetween(WEDNESDAY_AT_SIX, bounds);

    // assert
    expect(isoStarts(starts)).toEqual([
      '2026-10-14T15:00:00.000Z',
      '2026-10-21T15:00:00.000Z',
      '2026-10-28T16:00:00.000Z',
      '2026-11-04T16:00:00.000Z',
    ]);
  });

  it('skips the matching day when its hour falls before the first instant', () => {
    // arrange
    const bounds: SeriesBounds = {
      from: new Date('2026-10-14T15:30:00.000Z'),
      until: new Date('2026-10-29T00:00:00.000Z'),
    };

    // act
    const starts = weekStartsBetween(WEDNESDAY_AT_SIX, bounds);

    // assert
    expect(isoStarts(starts)).toEqual([
      '2026-10-21T15:00:00.000Z',
      '2026-10-28T16:00:00.000Z',
    ]);
  });

  it('creates nothing at or after the last instant', () => {
    // arrange
    const bounds: SeriesBounds = {
      from: new Date('2026-10-13T00:00:00.000Z'),
      until: new Date('2026-10-21T15:00:00.000Z'),
    };

    // act
    const starts = weekStartsBetween(WEDNESDAY_AT_SIX, bounds);

    // assert
    expect(isoStarts(starts)).toEqual(['2026-10-14T15:00:00.000Z']);
  });
});

describe('the bounds of a weekly check-in', () => {
  const now = new Date('2026-10-13T15:00:00.000Z');

  it('starts the first week no sooner than 24 hours away', () => {
    // arrange
    const window = {
      now,
      noticeMinutes: NOTICE_MINUTES,
      programStartsAt: new Date('2026-10-01T00:00:00.000Z'),
      paidThrough: new Date('2026-11-01T00:00:00.000Z'),
    };

    // act
    const bounds = seriesBounds(window);

    // assert
    expect(bounds).toEqual({
      from: new Date('2026-10-14T15:00:00.000Z'),
      until: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(isoStarts(weekStartsBetween(WEDNESDAY_AT_SIX, bounds as SeriesBounds))[0]).toBe(
      '2026-10-14T15:00:00.000Z',
    );
  });

  it('waits for her program to start when she chose to wait out the withdrawal period', () => {
    // arrange
    const programStartsAt = new Date('2026-10-27T09:00:00.000Z');
    const window = {
      now,
      noticeMinutes: NOTICE_MINUTES,
      programStartsAt,
      paidThrough: new Date('2026-12-13T09:00:00.000Z'),
    };

    // act
    const bounds = seriesBounds(window);

    // assert
    expect(bounds).toEqual({ from: programStartsAt, until: window.paidThrough });
    expect(isoStarts(weekStartsBetween(WEDNESDAY_AT_SIX, bounds as SeriesBounds))[0]).toBe(
      '2026-10-28T16:00:00.000Z',
    );
  });

  it('ends at her coaching end when it comes before her paid period ends', () => {
    // arrange
    const coachingEndsAt = new Date('2026-10-25T00:00:00.000Z');
    const window = {
      now,
      noticeMinutes: NOTICE_MINUTES,
      programStartsAt: new Date('2026-10-01T00:00:00.000Z'),
      paidThrough: new Date('2026-11-13T00:00:00.000Z'),
      coachingEndsAt,
    };

    // act
    const bounds = seriesBounds(window);

    // assert
    expect(bounds).toEqual({ from: new Date('2026-10-14T15:00:00.000Z'), until: coachingEndsAt });
  });

  it('has nothing to create once her paid period ends within the notice', () => {
    // arrange
    const window = {
      now,
      noticeMinutes: NOTICE_MINUTES,
      programStartsAt: new Date('2026-10-01T00:00:00.000Z'),
      paidThrough: new Date('2026-10-14T09:00:00.000Z'),
    };

    // act
    const bounds = seriesBounds(window);

    // assert
    expect(bounds).toBe('nothing_to_create');
  });
});

describe('setting up, changing and stopping a weekly check-in', () => {
  const setUpAt = new Date('2026-10-13T15:00:00.000Z');
  const bounds: SeriesBounds = {
    from: new Date('2026-10-14T15:00:00.000Z'),
    until: new Date('2026-11-06T00:00:00.000Z'),
  };

  it('covers the bounds and gives every week inside them', () => {
    // arrange
    const request = { id: 'series-1', clientId: 'c1', rule: WEDNESDAY_AT_SIX, bounds, at: setUpAt };

    // act
    const { series, starts } = seriesSetUp(request);

    // assert
    expect(series).toMatchObject({
      weekday: 3,
      hour: 18,
      timeZone: ZONE,
      coversFrom: bounds.from,
      coversUntil: bounds.until,
      setUpAt,
      changedAt: null,
      stoppedAt: null,
    });
    expect(starts).toHaveLength(4);
  });

  it('moves every week from the next matching day to the end of its cover', () => {
    // arrange
    const { series } = seriesSetUp({ id: 'series-1', clientId: 'c1', rule: WEDNESDAY_AT_SIX, bounds, at: setUpAt });
    const now = new Date('2026-10-20T10:00:00.000Z');
    const fridayAtFive: WeeklyRule = { weekday: 5, hour: 17, timeZone: ZONE };

    // act
    const changed = seriesChangedTo(series, { rule: fridayAtFive, now, noticeMinutes: NOTICE_MINUTES });

    // assert
    expect(changed.series).toMatchObject({ weekday: 5, hour: 17, changedAt: now, coversUntil: bounds.until });
    expect(isoStarts(changed.starts)).toEqual([
      '2026-10-23T14:00:00.000Z',
      '2026-10-30T15:00:00.000Z',
    ]);
  });

  it('adds only the weeks a renewal brings past its old cover', () => {
    // arrange
    const { series } = seriesSetUp({ id: 'series-1', clientId: 'c1', rule: WEDNESDAY_AT_SIX, bounds, at: setUpAt });
    const until = new Date('2026-11-20T00:00:00.000Z');

    // act
    const extended = seriesExtendedTo(series, until);

    // assert
    expect(extended.series).toMatchObject({ coversFrom: bounds.from, coversUntil: until });
    expect(isoStarts(extended.starts)).toEqual([
      '2026-11-11T16:00:00.000Z',
      '2026-11-18T16:00:00.000Z',
    ]);
  });

  it('records when it stopped', () => {
    // arrange
    const { series } = seriesSetUp({ id: 'series-1', clientId: 'c1', rule: WEDNESDAY_AT_SIX, bounds, at: setUpAt });
    const at = new Date('2026-10-20T10:00:00.000Z');

    // act
    const stopped = seriesStoppedAt(series, at);

    // assert
    expect(stopped.stoppedAt).toBe(at);
  });
});

describe('reading the onboarding day', () => {
  it.each([
    ['Monday', 1],
    ['wednesday', 3],
    [' SUNDAY ', 0],
  ])('reads %s as a weekday', (name, weekday) => {
    // arrange
    // act
    const read = weekdayNamed(name);

    // assert
    expect(read).toBe(weekday);
  });

  it.each([['Someday'], [null]])('reads %s as no weekday', (name) => {
    // arrange
    // act
    const read = weekdayNamed(name);

    // assert
    expect(read).toBeNull();
  });
});
