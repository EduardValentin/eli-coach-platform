import { describe, expect, it } from 'vitest';
import {
  classifyCalls,
  countCallsLeftToday,
  filterCalls,
  pageOfCalls,
  paginationSteps,
  parsePage,
  upcomingCalls,
  orderCalls,
  parseStatus,
} from './assessmentCallListing';
import {
  visitorFullName,
  type PrototypeBooking,
} from '../services/assessmentCallService';

const BUCHAREST = 'Europe/Bucharest';

function bookingAt(
  startsAt: string,
  details: Partial<PrototypeBooking> & { visitorName?: string } = {},
): PrototypeBooking {
  const { visitorName = 'Ana Popescu', ...rest } = details;
  const [firstName, ...lastNames] = visitorName.split(' ');
  return {
    id: `ac-${startsAt}`,
    startsAt: new Date(startsAt),
    firstName,
    lastName: lastNames.join(' '),
    visitorEmail: 'ana.popescu@example.com',
    dateOfBirth: '1994-03-14',
    gender: 'female',
    primaryGoal: 'build_strength',
    country: 'RO',
    phone: null,
    notes: '',
    visitorTimeZone: BUCHAREST,
    coachTimeZone: BUCHAREST,
    joinPath: `/book/ac-${startsAt}/join`,
    ...rest,
  };
}

function namesOf(calls: ReturnType<typeof classifyCalls>): string[] {
  return calls.map((call) => visitorFullName(call.booking));
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

  it('matches the last name on its own', () => {
    // arrange
    // act
    const filtered = filterCalls(calls, { status: 'all', query: 'marin' });

    // assert
    expect(namesOf(filtered)).toEqual(['Elena Marin']);
  });

  it('matches the full name as the card shows it', () => {
    // arrange
    // act
    const filtered = filterCalls(calls, { status: 'all', query: 'elena marin' });

    // assert
    expect(namesOf(filtered)).toEqual(['Elena Marin']);
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

describe('choosing the calls still to come', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');

  function classify(starts: string[]) {
    return classifyCalls(
      starts.map((iso, index) =>
        bookingAt(iso, { visitorName: `Visitor ${index + 1}` }),
      ),
      { now, timeZone: BUCHAREST },
    );
  }

  it('finds none when no call is booked', () => {
    // arrange
    const calls = classify([]);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(upcoming).toEqual([]);
  });

  it('finds none when every call has ended', () => {
    // arrange
    const calls = classify(['2026-09-20T15:00:00.000Z', '2026-09-21T06:00:00.000Z']);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(upcoming).toEqual([]);
  });

  it('returns the one call still to come', () => {
    // arrange
    const calls = classify(['2026-09-21T06:00:00.000Z', '2026-09-22T15:00:00.000Z']);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(namesOf(upcoming)).toEqual(['Visitor 2']);
  });

  it('returns three calls soonest first when exactly three are coming', () => {
    // arrange
    const calls = classify([
      '2026-09-23T15:00:00.000Z',
      '2026-09-21T15:00:00.000Z',
      '2026-09-22T15:00:00.000Z',
    ]);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(namesOf(upcoming)).toEqual(['Visitor 2', 'Visitor 3', 'Visitor 1']);
  });

  it('keeps only the three soonest when more are coming, ignoring ended ones', () => {
    // arrange
    const calls = classify([
      '2026-09-25T15:00:00.000Z',
      '2026-09-21T15:00:00.000Z',
      '2026-09-20T15:00:00.000Z',
      '2026-09-24T15:00:00.000Z',
      '2026-09-22T15:00:00.000Z',
    ]);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(namesOf(upcoming)).toEqual(['Visitor 2', 'Visitor 5', 'Visitor 4']);
  });

  it('keeps a call that is under way among the ones still to come', () => {
    // arrange
    const underWay = classifyCalls(
      [bookingAt('2026-09-21T08:50:00.000Z', { visitorName: 'Under way' })],
      { now, timeZone: BUCHAREST },
    );

    // act
    const upcoming = upcomingCalls(underWay, 3);

    // assert
    expect(namesOf(upcoming)).toEqual(['Under way']);
  });
});

describe('counting the calls left today', () => {
  const NOW = new Date('2026-09-21T09:00:00.000Z');

  function countLeft(starts: string[]): number {
    return countCallsLeftToday(
      classifyCalls(
        starts.map((start) => bookingAt(start)),
        { now: NOW, timeZone: BUCHAREST },
      ),
    );
  }

  it('counts the calls still to come today', () => {
    // arrange, act
    const count = countLeft([
      '2026-09-21T15:00:00.000Z',
      '2026-09-21T17:00:00.000Z',
    ]);

    // assert
    expect(count).toBe(2);
  });

  it('leaves out a call that already ended today', () => {
    // arrange, act
    const count = countLeft([
      '2026-09-21T06:00:00.000Z',
      '2026-09-21T15:00:00.000Z',
    ]);

    // assert
    expect(count).toBe(1);
  });

  it('keeps a call that is under way right now', () => {
    // arrange, act
    const count = countLeft(['2026-09-21T08:50:00.000Z']);

    // assert
    expect(count).toBe(1);
  });

  it('leaves out a call that is not until tomorrow', () => {
    // arrange, act
    const count = countLeft(['2026-09-22T15:00:00.000Z']);

    // assert
    expect(count).toBe(0);
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

describe('paging the assessment call list', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');

  const DAY_MS = 24 * 60 * 60 * 1000;
  const FIRST_START = new Date('2026-10-01T15:00:00.000Z').getTime();

  function classifyMany(count: number) {
    return classifyCalls(
      Array.from({ length: count }, (_, index) =>
        bookingAt(new Date(FIRST_START + index * DAY_MS).toISOString(), {
          visitorName: `Visitor ${index + 1}`,
        }),
      ),
      { now, timeZone: BUCHAREST },
    );
  }

  it('shows the first ten calls and counts the rest', () => {
    // arrange
    const calls = classifyMany(43);

    // act
    const view = pageOfCalls(calls, { page: 1, perPage: 10 });

    // assert
    expect(view.calls).toHaveLength(10);
    expect(view.page).toBe(1);
    expect(view.pageCount).toBe(5);
    expect(view.firstShown).toBe(1);
    expect(view.lastShown).toBe(10);
    expect(view.total).toBe(43);
  });

  it('shows the remainder on the last page', () => {
    // arrange
    const calls = classifyMany(43);

    // act
    const view = pageOfCalls(calls, { page: 5, perPage: 10 });

    // assert
    expect(view.calls).toHaveLength(3);
    expect(view.firstShown).toBe(41);
    expect(view.lastShown).toBe(43);
  });

  it('falls back to the last page when the page is past the end', () => {
    // arrange
    const calls = classifyMany(43);

    // act
    const view = pageOfCalls(calls, { page: 99, perPage: 10 });

    // assert
    expect(view.page).toBe(5);
    expect(view.calls).toHaveLength(3);
  });

  it('stays on one page when nothing is booked', () => {
    // arrange
    const calls = classifyMany(0);

    // act
    const view = pageOfCalls(calls, { page: 3, perPage: 10 });

    // assert
    expect(view.page).toBe(1);
    expect(view.pageCount).toBe(1);
    expect(view.total).toBe(0);
    expect(view.firstShown).toBe(0);
    expect(view.lastShown).toBe(0);
  });

  it('reads a page from the URL and falls back to the first', () => {
    // arrange
    const raw = ['3', '1', '0', '-2', 'two', '', null];

    // act
    const parsed = raw.map(parsePage);

    // assert
    expect(parsed).toEqual([3, 1, 1, 1, 1, 1, 1]);
  });

  it('numbers every page while they fit', () => {
    // arrange
    const pageCount = 5;

    // act
    const steps = paginationSteps(1, pageCount);

    // assert
    expect(steps).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses the run before the current page when there are many', () => {
    // arrange
    const pageCount = 20;

    // act
    const steps = paginationSteps(18, pageCount);

    // assert
    expect(steps).toEqual([1, 'gap', 17, 18, 19, 20]);
  });

  it('collapses both runs around a middle page', () => {
    // arrange
    const pageCount = 20;

    // act
    const steps = paginationSteps(10, pageCount);

    // assert
    expect(steps).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });
});
