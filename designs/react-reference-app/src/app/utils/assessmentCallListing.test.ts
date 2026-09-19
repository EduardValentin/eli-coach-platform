import { describe, expect, it } from 'vitest';
import {
  classifyCalls,
  countTodayCalls,
  filterCalls,
  nextCall,
  orderCalls,
  parseStatus,
} from './assessmentCallListing';
import type { PrototypeBooking } from '../services/assessmentCallService';

const BUCHAREST = 'Europe/Bucharest';

function bookingAt(
  startsAt: string,
  details: Partial<PrototypeBooking> = {},
): PrototypeBooking {
  return {
    id: `ac-${startsAt}`,
    startsAt: new Date(startsAt),
    visitorName: 'Ana Popescu',
    visitorEmail: 'ana.popescu@example.com',
    notes: '',
    visitorTimeZone: BUCHAREST,
    coachTimeZone: BUCHAREST,
    joinPath: `/book/ac-${startsAt}/join`,
    ...details,
  };
}

function namesOf(calls: ReturnType<typeof classifyCalls>): string[] {
  return calls.map((call) => call.booking.visitorName);
}

describe('classifying assessment calls', () => {
  it('keeps a call upcoming until the moment it ends', () => {
    // arrange
    const call = bookingAt('2026-09-21T09:00:00.000Z');
    const lastInstantBeforeEnd = new Date('2026-09-21T09:29:59.999Z');

    // act
    const [classified] = classifyCalls([call], {
      now: lastInstantBeforeEnd,
      timeZone: BUCHAREST,
    });

    // assert
    expect(classified.timing).toBe('upcoming');
  });

  it('turns a call past at its end instant', () => {
    // arrange
    const call = bookingAt('2026-09-21T09:00:00.000Z');
    const endInstant = new Date('2026-09-21T09:30:00.000Z');

    // act
    const [classified] = classifyCalls([call], {
      now: endInstant,
      timeZone: BUCHAREST,
    });

    // assert
    expect(classified.timing).toBe('past');
  });

  it('counts a call as today by the calendar date of the given zone', () => {
    // arrange
    const nightBefore = bookingAt('2026-09-21T21:30:00.000Z');
    const now = new Date('2026-09-21T09:00:00.000Z');

    // act
    const [inBucharest] = classifyCalls([nightBefore], {
      now,
      timeZone: BUCHAREST,
    });
    const [inLosAngeles] = classifyCalls([nightBefore], {
      now,
      timeZone: 'America/Los_Angeles',
    });

    // assert
    expect(inBucharest.isToday).toBe(false);
    expect(inLosAngeles.isToday).toBe(true);
  });

  it('holds the calendar date across the Bucharest daylight-saving end', () => {
    // arrange
    const beforeTheClocksChange = bookingAt('2026-10-24T21:30:00.000Z');
    const afterMidnightNextDay = bookingAt('2026-10-25T22:30:00.000Z');
    const now = new Date('2026-10-25T10:00:00.000Z');

    // act
    const classified = classifyCalls(
      [beforeTheClocksChange, afterMidnightNextDay],
      { now, timeZone: BUCHAREST },
    );

    // assert
    expect(classified[0].isToday).toBe(true);
    expect(classified[1].isToday).toBe(false);
  });

  it('marks a call that already ended today as both past and today', () => {
    // arrange
    const earlierToday = bookingAt('2026-09-21T06:00:00.000Z');
    const now = new Date('2026-09-21T09:00:00.000Z');

    // act
    const [classified] = classifyCalls([earlierToday], {
      now,
      timeZone: BUCHAREST,
    });

    // assert
    expect(classified.timing).toBe('past');
    expect(classified.isToday).toBe(true);
  });
});

describe('filtering assessment calls', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');
  const calls = classifyCalls(
    [
      bookingAt('2026-09-21T15:00:00.000Z', { visitorName: 'Maria Ionescu' }),
      bookingAt('2026-09-23T15:00:00.000Z', { visitorName: 'Ioana Radu' }),
      bookingAt('2026-09-20T15:00:00.000Z', { visitorName: 'Elena Marin' }),
      bookingAt('2026-09-21T06:00:00.000Z', { visitorName: 'Sofia Dinu' }),
    ],
    { now, timeZone: BUCHAREST },
  );

  it('keeps only calls that have not ended for upcoming', () => {
    // arrange
    const status = 'upcoming' as const;

    // act
    const filtered = filterCalls(calls, { status, query: '' });

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu', 'Ioana Radu']);
  });

  it('keeps every call that starts today whether or not it has ended', () => {
    // arrange
    const status = 'today' as const;

    // act
    const filtered = filterCalls(calls, { status, query: '' });

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu', 'Sofia Dinu']);
  });

  it('keeps only ended calls for past', () => {
    // arrange
    const status = 'past' as const;

    // act
    const filtered = filterCalls(calls, { status, query: '' });

    // assert
    expect(namesOf(filtered)).toEqual(['Elena Marin', 'Sofia Dinu']);
  });

  it('keeps every call for all', () => {
    // arrange
    const status = 'all' as const;

    // act
    const filtered = filterCalls(calls, { status, query: '' });

    // assert
    expect(filtered).toHaveLength(4);
  });

  it('matches a trimmed, case-insensitive part of the name within the status', () => {
    // arrange
    const status = 'all' as const;

    // act
    const filtered = filterCalls(calls, { status, query: '  IONE ' });

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu']);
  });

  it('matches part of the email address', () => {
    // arrange
    const withOwnEmail = classifyCalls(
      [
        bookingAt('2026-09-23T15:00:00.000Z', {
          visitorName: 'Ioana Radu',
          visitorEmail: 'ioana@studio.ro',
        }),
        bookingAt('2026-09-24T15:00:00.000Z', { visitorName: 'Elena Marin' }),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const filtered = filterCalls(withOwnEmail, {
      status: 'all',
      query: 'STUDIO.RO',
    });

    // assert
    expect(namesOf(filtered)).toEqual(['Ioana Radu']);
  });
});

describe('ordering assessment calls', () => {
  it('puts upcoming calls soonest first, then past calls most recent first', () => {
    // arrange
    const now = new Date('2026-09-21T09:00:00.000Z');
    const calls = classifyCalls(
      [
        bookingAt('2026-09-19T15:00:00.000Z', { visitorName: 'Older past' }),
        bookingAt('2026-09-24T15:00:00.000Z', { visitorName: 'Later upcoming' }),
        bookingAt('2026-09-20T15:00:00.000Z', { visitorName: 'Recent past' }),
        bookingAt('2026-09-22T15:00:00.000Z', { visitorName: 'Next upcoming' }),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const ordered = orderCalls(calls);

    // assert
    expect(namesOf(ordered)).toEqual([
      'Next upcoming',
      'Later upcoming',
      'Recent past',
      'Older past',
    ]);
  });
});

describe('choosing the next assessment call', () => {
  it('picks the soonest call that has not ended, whatever order it is given', () => {
    // arrange
    const now = new Date('2026-09-21T09:00:00.000Z');
    const calls = classifyCalls(
      [
        bookingAt('2026-09-22T15:00:00.000Z', { visitorName: 'Later upcoming' }),
        bookingAt('2026-09-21T15:00:00.000Z', { visitorName: 'Next upcoming' }),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const next = nextCall(calls);

    // assert
    expect(next?.booking.visitorName).toBe('Next upcoming');
  });

  it('passes over a call that already ended today', () => {
    // arrange
    const now = new Date('2026-09-21T09:00:00.000Z');
    const calls = classifyCalls(
      [
        bookingAt('2026-09-21T06:00:00.000Z', { visitorName: 'Ended today' }),
        bookingAt('2026-09-21T15:00:00.000Z', { visitorName: 'Still to come' }),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const next = nextCall(calls);

    // assert
    expect(next?.booking.visitorName).toBe('Still to come');
  });

  it('keeps a call that is under way as the next one', () => {
    // arrange
    const now = new Date('2026-09-21T09:15:00.000Z');
    const calls = classifyCalls(
      [bookingAt('2026-09-21T09:00:00.000Z', { visitorName: 'Under way' })],
      { now, timeZone: BUCHAREST },
    );

    // act
    const next = nextCall(calls);

    // assert
    expect(next?.booking.visitorName).toBe('Under way');
  });

  it('finds none when every call has ended', () => {
    // arrange
    const now = new Date('2026-09-21T09:00:00.000Z');
    const calls = classifyCalls([bookingAt('2026-09-20T15:00:00.000Z')], {
      now,
      timeZone: BUCHAREST,
    });

    // act
    const next = nextCall(calls);

    // assert
    expect(next).toBeUndefined();
  });

  it('finds none when no call is booked', () => {
    // arrange
    const calls = classifyCalls([], {
      now: new Date('2026-09-21T09:00:00.000Z'),
      timeZone: BUCHAREST,
    });

    // act
    const next = nextCall(calls);

    // assert
    expect(next).toBeUndefined();
  });
});

describe('counting today’s assessment calls', () => {
  it('counts every call starting today, ended or not', () => {
    // arrange
    const now = new Date('2026-09-21T09:00:00.000Z');
    const calls = classifyCalls(
      [
        bookingAt('2026-09-21T06:00:00.000Z'),
        bookingAt('2026-09-21T15:00:00.000Z'),
        bookingAt('2026-09-22T15:00:00.000Z'),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const count = countTodayCalls(calls);

    // assert
    expect(count).toBe(2);
  });
});

describe('reading the status filter from the URL', () => {
  it('accepts the four known statuses', () => {
    // arrange
    const raw = ['upcoming', 'today', 'past', 'all'];

    // act
    const parsed = raw.map(parseStatus);

    // assert
    expect(parsed).toEqual(['upcoming', 'today', 'past', 'all']);
  });

  it('falls back to upcoming for a missing or unknown status', () => {
    // arrange
    const unknown = 'yesterday';

    // act
    const fromUnknown = parseStatus(unknown);
    const fromMissing = parseStatus(null);

    // assert
    expect(fromUnknown).toBe('upcoming');
    expect(fromMissing).toBe('upcoming');
  });
});
