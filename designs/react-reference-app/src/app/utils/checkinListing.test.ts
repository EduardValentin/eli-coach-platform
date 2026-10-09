import { describe, expect, it } from 'vitest';
import type { CheckIn } from '../domain/checkins';
import {
  countsByKind,
  countsByWaiting,
  filterCheckins,
  hasActiveFilters,
  orderCheckins,
  parseDirection,
  parseKindFilter,
  parseTab,
  parseWaitingFilter,
  type CheckinSelection,
} from './checkinListing';

const NO_FILTERS: CheckinSelection = { kind: 'any', waiting: 'any', query: '' };

function checkin(overrides: Partial<CheckIn>): CheckIn {
  return {
    id: 'ck-test',
    clientId: 'c1',
    clientName: 'Jane Doe',
    coachId: 'coach-1',
    date: '2026-10-16',
    time: '10:00',
    kind: 'ad-hoc',
    status: 'pending',
    initiatedBy: 'client',
    proposedBy: 'client',
    createdAt: '2026-10-01T09:00:00.000Z',
    rescheduleCount: 0,
    ...overrides,
  };
}

const fromJane = checkin({ id: 'from-jane', date: '2026-10-20' });
const fromCoach = checkin({
  id: 'from-coach',
  clientId: 'c2',
  clientName: 'Jessica Alba',
  date: '2026-10-14',
  initiatedBy: 'coach',
  proposedBy: 'coach',
});
const recurring = checkin({
  id: 'recurring',
  kind: 'recurring',
  date: '2026-10-15',
  initiatedBy: 'coach',
  proposedBy: 'coach',
});

describe('filtering check-ins', () => {
  it('keeps only the check-ins awaiting the viewer', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, waiting: 'you' };

    // act
    const shown = filterCheckins([fromJane, fromCoach], selection, 'coach');

    // assert
    expect(shown.map((c) => c.id)).toEqual(['from-jane']);
  });

  it('keeps only the check-ins waiting for the other party', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, waiting: 'them' };

    // act
    const shown = filterCheckins([fromJane, fromCoach], selection, 'coach');

    // assert
    expect(shown.map((c) => c.id)).toEqual(['from-coach']);
  });

  it('keeps only one kind', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, kind: 'recurring' };

    // act
    const shown = filterCheckins([fromJane, recurring], selection, 'coach');

    // assert
    expect(shown.map((c) => c.id)).toEqual(['recurring']);
  });

  it('matches the client name in any case', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, query: ' jessica ' };

    // act
    const shown = filterCheckins([fromJane, fromCoach], selection, 'coach');

    // assert
    expect(shown.map((c) => c.id)).toEqual(['from-coach']);
  });
});

describe('counting check-ins per filter option', () => {
  it('counts each kind under the other filters', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, waiting: 'them' };

    // act
    const counts = countsByKind([fromJane, fromCoach, recurring], selection, 'coach');

    // assert
    expect(counts).toEqual({
      any: 2,
      recurring: 1,
      'ad-hoc': 1,
      'program-review': 0,
    });
  });

  it('counts who is waiting under the other filters', () => {
    // arrange
    const selection: CheckinSelection = { ...NO_FILTERS, kind: 'ad-hoc' };

    // act
    const counts = countsByWaiting([fromJane, fromCoach, recurring], selection, 'coach');

    // assert
    expect(counts).toEqual({ any: 2, you: 1, them: 1 });
  });
});

describe('ordering check-ins', () => {
  it('lists requests awaiting the viewer first, then by date', () => {
    // arrange
    const checkins = [recurring, fromCoach, fromJane];

    // act
    const ordered = orderCheckins(checkins, {
      tab: 'requests',
      direction: 'asc',
      party: 'coach',
    });

    // assert
    expect(ordered.map((c) => c.id)).toEqual(['from-jane', 'from-coach', 'recurring']);
  });

  it('orders other tabs by date alone', () => {
    // arrange
    const checkins = [fromJane, recurring, fromCoach];

    // act
    const ordered = orderCheckins(checkins, {
      tab: 'past',
      direction: 'desc',
      party: 'coach',
    });

    // assert
    expect(ordered.map((c) => c.id)).toEqual(['from-jane', 'recurring', 'from-coach']);
  });
});

describe('reading the listing from the URL', () => {
  it('falls back to the given tab for an unknown one', () => {
    // arrange
    const raw = ['past', 'pending', null];

    // act
    const tabs = raw.map((value) => parseTab(value, 'requests'));

    // assert
    expect(tabs).toEqual(['past', 'requests', 'requests']);
  });

  it('falls back to every kind and every party', () => {
    // arrange
    const raw = 'unknown';

    // act
    const filters = [parseKindFilter(raw), parseWaitingFilter(raw)];

    // assert
    expect(filters).toEqual(['any', 'any']);
  });

  it('starts past check-ins newest first and the rest soonest first', () => {
    // arrange
    const tabs = ['past', 'upcoming', 'requests'] as const;

    // act
    const directions = tabs.map((tab) => parseDirection(null, tab));

    // assert
    expect(directions).toEqual(['desc', 'asc', 'asc']);
  });

  it('knows when a filter or search is active', () => {
    // arrange
    const searching: CheckinSelection = { ...NO_FILTERS, query: 'jane' };

    // act
    const active = [hasActiveFilters(NO_FILTERS), hasActiveFilters(searching)];

    // assert
    expect(active).toEqual([false, true]);
  });
});
