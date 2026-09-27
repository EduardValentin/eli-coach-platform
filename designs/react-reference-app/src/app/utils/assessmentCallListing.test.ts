import { subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  classifyCalls,
  countCallsLeftToday,
  countsByJourneyStep,
  defaultDirectionFor,
  emptyListingMessage,
  filterCalls,
  hasActiveFilters,
  orderCallsBy,
  pageOfCalls,
  paginationSteps,
  parseJourneyStep,
  parsePage,
  parseSortDirection,
  parseSortKey,
  upcomingCalls,
  orderCalls,
  parseStatus,
  withJourneyStages,
  type CallSort,
  type ListedCall,
  type ListingSelection,
} from './assessmentCallListing';
import {
  visitorFullName,
  type PrototypeBooking,
} from '../services/assessmentCallService';
import type { JourneyStage } from '../domain/journey';

const BUCHAREST = 'Europe/Bucharest';

function bookingAt(
  startsAt: string,
  details: Partial<PrototypeBooking> = {},
): PrototypeBooking {
  return {
    id: `ac-${startsAt}`,
    startsAt: new Date(startsAt),
    bookedAt: subDays(new Date(startsAt), 3),
    firstName: 'Ana',
    lastName: 'Popescu',
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
    ...details,
  };
}

function namesOf(calls: ReturnType<typeof classifyCalls>): string[] {
  return calls.map((call) => visitorFullName(call.booking));
}

function listed(
  calls: ReturnType<typeof classifyCalls>,
  stages: Record<string, JourneyStage> = {},
): ListedCall[] {
  return withJourneyStages(calls, (callId) => stages[callId] ?? null);
}

function selecting(details: Partial<ListingSelection> = {}): ListingSelection {
  return {
    status: 'all',
    query: '',
    journey: 'any',
    ...details,
  };
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
      bookingAt('2026-09-21T15:00:00.000Z', {
        firstName: 'Maria',
        lastName: 'Ionescu',
      }),
      bookingAt('2026-09-23T15:00:00.000Z', {
        firstName: 'Ioana',
        lastName: 'Radu',
      }),
      bookingAt('2026-09-20T15:00:00.000Z', {
        firstName: 'Elena',
        lastName: 'Marin',
      }),
      bookingAt('2026-09-21T06:00:00.000Z', {
        firstName: 'Sofia',
        lastName: 'Dinu',
      }),
    ],
    { now, timeZone: BUCHAREST },
  );

  it('excludes a call later today from upcoming, keeping only later days', () => {
    // arrange
    const status = 'upcoming' as const;

    // act
    const filtered = filterCalls(listed(calls), selecting({ status }));

    // assert
    expect(namesOf(filtered)).toEqual(['Ioana Radu']);
  });

  it('keeps every call that starts today whether or not it has ended', () => {
    // arrange
    const status = 'today' as const;

    // act
    const filtered = filterCalls(listed(calls), selecting({ status }));

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu', 'Sofia Dinu']);
  });

  it('keeps only ended calls for past', () => {
    // arrange
    const status = 'past' as const;

    // act
    const filtered = filterCalls(listed(calls), selecting({ status }));

    // assert
    expect(namesOf(filtered)).toEqual(['Elena Marin', 'Sofia Dinu']);
  });

  it('keeps every call for all', () => {
    // arrange
    const status = 'all' as const;

    // act
    const filtered = filterCalls(listed(calls), selecting({ status }));

    // assert
    expect(filtered).toHaveLength(4);
  });

  it('matches a trimmed, case-insensitive part of the name within the status', () => {
    // arrange
    const status = 'all' as const;

    // act
    const filtered = filterCalls(
      listed(calls),
      selecting({ status, query: '  IONE ' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu']);
  });

  it('matches part of the email address', () => {
    // arrange
    const withOwnEmail = classifyCalls(
      [
        bookingAt('2026-09-23T15:00:00.000Z', {
          firstName: 'Ioana',
          lastName: 'Radu',
          visitorEmail: 'ioana@studio.ro',
        }),
        bookingAt('2026-09-24T15:00:00.000Z', {
          firstName: 'Elena',
          lastName: 'Marin',
        }),
      ],
      { now, timeZone: BUCHAREST },
    );

    // act
    const filtered = filterCalls(
      listed(withOwnEmail),
      selecting({ query: 'STUDIO.RO' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Ioana Radu']);
  });

  it('matches the last name on its own', () => {
    // arrange
    const query = 'marin';

    // act
    const filtered = filterCalls(listed(calls), selecting({ query }));

    // assert
    expect(namesOf(filtered)).toEqual(['Elena Marin']);
  });

  it('matches the full name as the card shows it', () => {
    // arrange
    const query = 'elena marin';

    // act
    const filtered = filterCalls(listed(calls), selecting({ query }));

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
        bookingAt('2026-09-19T15:00:00.000Z', {
          firstName: 'Older',
          lastName: 'past',
        }),
        bookingAt('2026-09-24T15:00:00.000Z', {
          firstName: 'Later',
          lastName: 'upcoming',
        }),
        bookingAt('2026-09-20T15:00:00.000Z', {
          firstName: 'Recent',
          lastName: 'past',
        }),
        bookingAt('2026-09-22T15:00:00.000Z', {
          firstName: 'Next',
          lastName: 'upcoming',
        }),
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

describe('sorting assessment calls by a chosen key', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');
  const calls = listed(
    classifyCalls(
      [
        bookingAt('2026-09-19T15:00:00.000Z', {
          firstName: 'Older',
          lastName: 'past',
          visitorEmail: 'zoe@example.com',
          bookedAt: new Date('2026-09-01T10:00:00.000Z'),
        }),
        bookingAt('2026-09-24T15:00:00.000Z', {
          firstName: 'Later',
          lastName: 'upcoming',
          visitorEmail: 'Mara@example.com',
          bookedAt: new Date('2026-09-20T10:00:00.000Z'),
        }),
        bookingAt('2026-09-20T15:00:00.000Z', {
          firstName: 'Recent',
          lastName: 'past',
          visitorEmail: 'anca@example.com',
          bookedAt: new Date('2026-09-10T10:00:00.000Z'),
        }),
        bookingAt('2026-09-22T15:00:00.000Z', {
          firstName: 'Next',
          lastName: 'upcoming',
          visitorEmail: 'bianca@example.com',
          bookedAt: new Date('2026-09-15T10:00:00.000Z'),
        }),
      ],
      { now, timeZone: BUCHAREST },
    ),
  );

  function sorted(sort: CallSort): string[] {
    return namesOf(orderCallsBy(calls, sort));
  }

  it('keeps the listing order for the scheduled date by default', () => {
    // arrange
    const sort: CallSort = { key: 'scheduled', direction: 'desc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Next upcoming',
      'Later upcoming',
      'Recent past',
      'Older past',
    ]);
  });

  it('reverses the whole listing order for the scheduled date', () => {
    // arrange
    const sort: CallSort = { key: 'scheduled', direction: 'asc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Older past',
      'Recent past',
      'Later upcoming',
      'Next upcoming',
    ]);
  });

  it('puts the newest booking first by the booking date', () => {
    // arrange
    const sort: CallSort = { key: 'booked', direction: 'desc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Later upcoming',
      'Next upcoming',
      'Recent past',
      'Older past',
    ]);
  });

  it('puts the oldest booking first when the booking date is reversed', () => {
    // arrange
    const sort: CallSort = { key: 'booked', direction: 'asc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Older past',
      'Recent past',
      'Next upcoming',
      'Later upcoming',
    ]);
  });

  it('orders names A to Z regardless of case', () => {
    // arrange
    const sort: CallSort = { key: 'name', direction: 'asc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Later upcoming',
      'Next upcoming',
      'Older past',
      'Recent past',
    ]);
  });

  it('orders names Z to A when reversed', () => {
    // arrange
    const sort: CallSort = { key: 'name', direction: 'desc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Recent past',
      'Older past',
      'Next upcoming',
      'Later upcoming',
    ]);
  });

  it('orders email addresses A to Z regardless of case', () => {
    // arrange
    const sort: CallSort = { key: 'email', direction: 'asc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Recent past',
      'Next upcoming',
      'Later upcoming',
      'Older past',
    ]);
  });

  it('orders email addresses Z to A when reversed', () => {
    // arrange
    const sort: CallSort = { key: 'email', direction: 'desc' };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      'Older past',
      'Later upcoming',
      'Next upcoming',
      'Recent past',
    ]);
  });
});

describe('reading the sort from the URL', () => {
  it('accepts the four sort keys and falls back to the scheduled date', () => {
    // arrange
    const raw = ['scheduled', 'booked', 'name', 'email', 'phone', null];

    // act
    const parsed = raw.map(parseSortKey);

    // assert
    expect(parsed).toEqual([
      'scheduled',
      'booked',
      'name',
      'email',
      'scheduled',
      'scheduled',
    ]);
  });

  it('starts dates newest first and text A to Z', () => {
    // arrange
    const keys = ['scheduled', 'booked', 'name', 'email'] as const;

    // act
    const directions = keys.map(defaultDirectionFor);

    // assert
    expect(directions).toEqual(['desc', 'desc', 'asc', 'asc']);
  });

  it("accepts an explicit direction and falls back to the key's own", () => {
    // act
    const explicit = parseSortDirection('asc', 'booked');
    const missingForDate = parseSortDirection(null, 'booked');
    const unknownForText = parseSortDirection('sideways', 'name');

    // assert
    expect(explicit).toBe('asc');
    expect(missingForDate).toBe('desc');
    expect(unknownForText).toBe('asc');
  });
});

describe('choosing the calls still to come', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');

  function classify(starts: string[]) {
    return classifyCalls(
      starts.map((iso, index) =>
        bookingAt(iso, { firstName: 'Visitor', lastName: `${index + 1}` }),
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
    const calls = classify([
      '2026-09-20T15:00:00.000Z',
      '2026-09-21T06:00:00.000Z',
    ]);

    // act
    const upcoming = upcomingCalls(calls, 3);

    // assert
    expect(upcoming).toEqual([]);
  });

  it('returns the one call still to come', () => {
    // arrange
    const calls = classify([
      '2026-09-21T06:00:00.000Z',
      '2026-09-22T15:00:00.000Z',
    ]);

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
      [
        bookingAt('2026-09-21T08:50:00.000Z', {
          firstName: 'Under',
          lastName: 'way',
        }),
      ],
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

  it('falls back to all for a missing or unknown status', () => {
    // arrange
    const unknown = 'yesterday';

    // act
    const fromUnknown = parseStatus(unknown);
    const fromMissing = parseStatus(null);

    // assert
    expect(fromUnknown).toBe('all');
    expect(fromMissing).toBe('all');
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
          firstName: 'Visitor',
          lastName: `${index + 1}`,
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

describe('filtering assessment calls by journey step', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');
  const bookings = [
    bookingAt('2026-09-18T15:00:00.000Z', {
      firstName: 'Link',
      lastName: 'sent',
    }),
    bookingAt('2026-09-20T15:00:00.000Z', {
      firstName: 'Invited',
      lastName: 'client',
    }),
    bookingAt('2026-09-17T15:00:00.000Z', {
      firstName: 'Held',
      lastName: 'call',
    }),
    bookingAt('2026-09-16T15:00:00.000Z', {
      firstName: 'No',
      lastName: 'journey',
    }),
  ];
  const stages: Record<string, JourneyStage> = {
    'ac-2026-09-18T15:00:00.000Z': 'payment-link-sent',
    'ac-2026-09-20T15:00:00.000Z': 'invited',
    'ac-2026-09-17T15:00:00.000Z': 'held',
  };
  const calls = listed(
    classifyCalls(bookings, { now, timeZone: BUCHAREST }),
    stages,
  );

  it('keeps only the calls waiting at the chosen step', () => {
    // act
    const filtered = filterCalls(
      calls,
      selecting({ journey: 'payment-link-sent' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Link sent']);
  });

  it('drops a call that has already moved past the chosen step', () => {
    // act
    const filtered = filterCalls(calls, selecting({ journey: 'paid' }));

    // assert
    expect(namesOf(filtered)).toEqual(['Invited client']);
  });

  it('matches a journey further along than invited at the paid step', () => {
    // arrange
    const advancedCalls = listed(
      classifyCalls(bookings, { now, timeZone: BUCHAREST }),
      { ...stages, 'ac-2026-09-20T15:00:00.000Z': 'onboarding' },
    );

    // act
    const filtered = filterCalls(advancedCalls, selecting({ journey: 'paid' }));

    // assert
    expect(namesOf(filtered)).toEqual(['Invited client']);
  });

  it('matches a held call and a call with no journey only under any', () => {
    // act
    const anyStep = filterCalls(calls, selecting({ journey: 'any' }));

    // assert
    expect(namesOf(anyStep)).toContain('Held call');
    expect(namesOf(anyStep)).toContain('No journey');
  });

  it('combines the journey step with the time window and the search', () => {
    // act
    const filtered = filterCalls(
      calls,
      selecting({ status: 'past', journey: 'paid', query: 'invited' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Invited client']);
  });

  it('finds nothing when the axes disagree', () => {
    // act
    const filtered = filterCalls(
      calls,
      selecting({ status: 'upcoming', journey: 'paid' }),
    );

    // assert
    expect(filtered).toEqual([]);
  });

  it('counts each step within the rest of the selection', () => {
    // act
    const counts = countsByJourneyStep(calls, selecting({ query: 'call' }));

    // assert
    expect(counts).toEqual({
      any: 1,
      held: 1,
      'payment-link-sent': 0,
      paid: 0,
    });
  });

  it('leaves a call that has not ended out of Call held', () => {
    // arrange
    const withUpcomingHeld = listed(
      classifyCalls(
        [
          ...bookings,
          bookingAt('2026-09-22T15:00:00.000Z', {
            firstName: 'Upcoming',
            lastName: 'call',
          }),
        ],
        { now, timeZone: BUCHAREST },
      ),
      { ...stages, 'ac-2026-09-22T15:00:00.000Z': 'held' },
    );

    // act
    const counts = countsByJourneyStep(
      withUpcomingHeld,
      selecting({ query: 'call' }),
    );

    // assert
    expect(counts).toEqual({
      any: 2,
      held: 1,
      'payment-link-sent': 0,
      paid: 0,
    });
  });
});

describe('reading the journey step from the URL', () => {
  it('accepts a known journey step and falls back to any', () => {
    // act
    const paid = parseJourneyStep('paid');
    const unknown = parseJourneyStep('invited');
    const missing = parseJourneyStep(null);

    // assert
    expect(paid).toBe('paid');
    expect(unknown).toBe('any');
    expect(missing).toBe('any');
  });
});

describe('the message shown when nothing matches', () => {
  it('names the search before anything else', () => {
    // act
    const message = emptyListingMessage(
      selecting({ status: 'past', journey: 'paid', query: 'ana' }),
    );

    // assert
    expect(message).toBe('No calls match your search.');
  });

  it('keeps the plain window messages when no other filter is on', () => {
    // act
    const messages = (['upcoming', 'today', 'past', 'all'] as const).map(
      (status) => emptyListingMessage(selecting({ status })),
    );

    // assert
    expect(messages).toEqual([
      'No upcoming calls.',
      'No calls today.',
      'No past calls.',
      'No calls yet.',
    ]);
  });

  it('names the window and the journey step together', () => {
    // act
    const message = emptyListingMessage(
      selecting({ status: 'upcoming', journey: 'paid' }),
    );

    // assert
    expect(message).toBe('No upcoming calls match the Paid status.');
  });
});

describe('deciding whether any filter is active', () => {
  it('is inactive when the selection is at its defaults', () => {
    // act
    const active = hasActiveFilters(selecting());

    // assert
    expect(active).toBe(false);
  });

  it('is active when the time window, the journey step, or the search is set', () => {
    // act
    const byStatus = hasActiveFilters(selecting({ status: 'past' }));
    const byJourney = hasActiveFilters(selecting({ journey: 'paid' }));
    const byQuery = hasActiveFilters(selecting({ query: 'ana' }));

    // assert
    expect(byStatus).toBe(true);
    expect(byJourney).toBe(true);
    expect(byQuery).toBe(true);
  });
});
