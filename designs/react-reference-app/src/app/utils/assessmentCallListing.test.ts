import { describe, expect, it } from 'vitest';
import {
  classifyCalls,
  countCallsLeftToday,
  countsByJourneyStep,
  emptyListingMessage,
  filterCalls,
  isChosenRange,
  NO_DATE_RANGE,
  orderCallsFor,
  pageOfCalls,
  paginationSteps,
  parseDateRange,
  parseJourneyStep,
  parsePage,
  upcomingCalls,
  orderCalls,
  parseStatus,
  withJourneyStages,
  type ListedCall,
  type ListingSelection,
} from './assessmentCallListing';
import type { PrototypeBooking } from '../services/assessmentCallService';
import type { JourneyStage } from '../domain/journey';

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
    range: NO_DATE_RANGE,
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
    const filtered = filterCalls(listed(calls), selecting({ status }));

    // assert
    expect(namesOf(filtered)).toEqual(['Maria Ionescu', 'Ioana Radu']);
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
    const filtered = filterCalls(listed(calls), selecting({ status, query: '  IONE ' }));

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
    const filtered = filterCalls(
      listed(withOwnEmail),
      selecting({ query: 'STUDIO.RO' }),
    );

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

describe('filtering assessment calls by a date range', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');
  const calls = classifyCalls(
    [
      bookingAt('2026-09-10T15:00:00.000Z', { visitorName: 'Before' }),
      bookingAt('2026-09-11T21:00:00.000Z', { visitorName: 'Midnight start' }),
      bookingAt('2026-09-12T05:00:00.000Z', { visitorName: 'First day' }),
      bookingAt('2026-09-16T15:00:00.000Z', { visitorName: 'Middle' }),
      bookingAt('2026-09-20T20:00:00.000Z', { visitorName: 'Last day' }),
      bookingAt('2026-09-21T15:00:00.000Z', { visitorName: 'After' }),
    ],
    { now, timeZone: BUCHAREST },
  );

  it('keeps both boundary days of the range', () => {
    // arrange
    const range = { from: '2026-09-12', to: '2026-09-20' };

    // act
    const filtered = filterCalls(
      listed(calls),
      selecting({ status: 'custom', range }),
    );

    // assert
    expect(namesOf(filtered)).toEqual([
      'Midnight start',
      'First day',
      'Middle',
      'Last day',
    ]);
  });

  it('reads the day of a call in the coach time zone, not in UTC', () => {
    // arrange
    const range = { from: '2026-09-12', to: '2026-09-12' };

    // act
    const filtered = filterCalls(
      listed(calls),
      selecting({ status: 'custom', range }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Midnight start', 'First day']);
  });

  it('keeps every call while the range is still half picked', () => {
    // arrange
    const range = { from: '2026-09-12', to: null };

    // act
    const filtered = filterCalls(
      listed(calls),
      selecting({ status: 'custom', range }),
    );

    // assert
    expect(filtered).toHaveLength(6);
  });

  it('ignores the range outside the custom selection', () => {
    // arrange
    const range = { from: '2026-09-12', to: '2026-09-12' };

    // act
    const filtered = filterCalls(listed(calls), selecting({ range }));

    // assert
    expect(filtered).toHaveLength(6);
  });

  it('lists a custom range soonest first across the present', () => {
    // arrange
    const range = { from: '2026-09-12', to: '2026-09-21' };

    // act
    const ordered = orderCallsFor(
      filterCalls(listed(calls), selecting({ status: 'custom', range })),
      'custom',
    );

    // assert
    expect(namesOf(ordered)).toEqual([
      'Midnight start',
      'First day',
      'Middle',
      'Last day',
      'After',
    ]);
  });
});

describe('filtering assessment calls by journey step', () => {
  const now = new Date('2026-09-21T09:00:00.000Z');
  const bookings = [
    bookingAt('2026-09-18T15:00:00.000Z', { visitorName: 'Link sent' }),
    bookingAt('2026-09-19T15:00:00.000Z', { visitorName: 'Paid' }),
    bookingAt('2026-09-20T15:00:00.000Z', { visitorName: 'Invited' }),
    bookingAt('2026-09-17T15:00:00.000Z', { visitorName: 'Held' }),
    bookingAt('2026-09-16T15:00:00.000Z', { visitorName: 'No journey' }),
  ];
  const stages: Record<string, JourneyStage> = {
    'ac-2026-09-18T15:00:00.000Z': 'payment-link-sent',
    'ac-2026-09-19T15:00:00.000Z': 'paid',
    'ac-2026-09-20T15:00:00.000Z': 'invited',
    'ac-2026-09-17T15:00:00.000Z': 'held',
  };
  const calls = listed(classifyCalls(bookings, { now, timeZone: BUCHAREST }), stages);

  it('keeps only the calls waiting at the chosen step', () => {
    // act
    const filtered = filterCalls(calls, selecting({ journey: 'paid' }));

    // assert
    expect(namesOf(filtered)).toEqual(['Paid']);
  });

  it('drops a call that has already moved past the chosen step', () => {
    // act
    const filtered = filterCalls(
      calls,
      selecting({ journey: 'payment-link-sent' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Link sent']);
  });

  it('matches a held call and a call with no journey only under any', () => {
    // act
    const anyStep = filterCalls(calls, selecting({ journey: 'any' }));
    const invited = filterCalls(calls, selecting({ journey: 'invited' }));

    // assert
    expect(namesOf(anyStep)).toContain('Held');
    expect(namesOf(anyStep)).toContain('No journey');
    expect(namesOf(invited)).toEqual(['Invited']);
  });

  it('combines the journey step with the time window and the search', () => {
    // arrange
    const range = { from: '2026-09-18', to: '2026-09-20' };

    // act
    const filtered = filterCalls(
      calls,
      selecting({ status: 'custom', range, journey: 'invited', query: 'invited' }),
    );

    // assert
    expect(namesOf(filtered)).toEqual(['Invited']);
  });

  it('finds nothing when the axes disagree', () => {
    // arrange
    const range = { from: '2026-09-16', to: '2026-09-17' };

    // act
    const filtered = filterCalls(
      calls,
      selecting({ status: 'custom', range, journey: 'paid' }),
    );

    // assert
    expect(filtered).toEqual([]);
  });

  it('counts each step within the rest of the selection', () => {
    // arrange
    const range = { from: '2026-09-18', to: '2026-09-19' };

    // act
    const counts = countsByJourneyStep(
      calls,
      selecting({ status: 'custom', range }),
    );

    // assert
    expect(counts).toEqual({
      any: 2,
      'payment-link-sent': 1,
      paid: 1,
      invited: 0,
    });
  });
});

describe('reading a listing selection from the URL', () => {
  it('accepts the custom window and falls back to all otherwise', () => {
    // act
    const custom = parseStatus('custom');
    const unknown = parseStatus('someday');

    // assert
    expect(custom).toBe('custom');
    expect(unknown).toBe('all');
  });

  it('accepts a known journey step and falls back to any', () => {
    // act
    const paid = parseJourneyStep('paid');
    const unknown = parseJourneyStep('refunded');
    const missing = parseJourneyStep(null);

    // assert
    expect(paid).toBe('paid');
    expect(unknown).toBe('any');
    expect(missing).toBe('any');
  });

  it('keeps a pair of ISO days and drops anything else', () => {
    // act
    const both = parseDateRange('2026-09-12', '2026-09-20');
    const partial = parseDateRange('2026-09-12', null);
    const rubbish = parseDateRange('12/09/2026', '2026-13-45');

    // assert
    expect(both).toEqual({ from: '2026-09-12', to: '2026-09-20' });
    expect(partial).toEqual({ from: '2026-09-12', to: null });
    expect(rubbish).toEqual({ from: null, to: null });
  });

  it('puts a reversed pair of days back in order', () => {
    // act
    const range = parseDateRange('2026-09-20', '2026-09-12');

    // assert
    expect(range).toEqual({ from: '2026-09-12', to: '2026-09-20' });
    expect(isChosenRange(range)).toBe(true);
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
      selecting({ status: 'upcoming', journey: 'payment-link-sent' }),
    );

    // assert
    expect(message).toBe('No upcoming calls with a payment link sent.');
  });

  it('names the picked days, dropping a month both days share', () => {
    // act
    const message = emptyListingMessage(
      selecting({
        status: 'custom',
        range: { from: '2026-09-12', to: '2026-09-20' },
      }),
    );

    // assert
    expect(message).toBe('No calls between 12 and 20 September.');
  });

  it('names both months, and both years when the range crosses one', () => {
    // act
    const acrossMonths = emptyListingMessage(
      selecting({
        status: 'custom',
        range: { from: '2026-09-12', to: '2026-10-03' },
      }),
    );
    const acrossYears = emptyListingMessage(
      selecting({
        status: 'custom',
        range: { from: '2026-12-28', to: '2027-01-03' },
      }),
    );

    // assert
    expect(acrossMonths).toBe('No calls between 12 September and 3 October.');
    expect(acrossYears).toBe(
      'No calls between 28 December 2026 and 3 January 2027.',
    );
  });

  it('falls back to the plain message while the range is half picked', () => {
    // act
    const message = emptyListingMessage(
      selecting({ status: 'custom', range: { from: '2026-09-12', to: null } }),
    );

    // assert
    expect(message).toBe('No calls yet.');
  });
});
