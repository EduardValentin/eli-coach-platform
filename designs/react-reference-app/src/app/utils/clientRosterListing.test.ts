import { describe, expect, it } from 'vitest';
import { clientStatusNamed } from '../domain/clientStatus';
import {
  countsByStatus,
  defaultRosterSortDirectionFor,
  emptyRosterMessage,
  hasActiveRosterFilters,
  matchesView,
  parseRosterSortDirection,
  parseRosterSortKey,
  parseRosterStatus,
  parseRosterView,
  rowsMatching,
  sortRows,
  type RosterRow,
  type RosterSelection,
} from './clientRosterListing';

function row(details: Partial<RosterRow> = {}): RosterRow {
  return {
    id: 'r1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: clientStatusNamed('Active'),
    bundleLabel: '3 months',
    joinedAt: new Date('2025-10-01'),
    detailPath: '/coach/clients/r1',
    actionLabel: 'View details for Jane Doe',
    ...details,
  };
}

function selecting(details: Partial<RosterSelection> = {}): RosterSelection {
  return { view: 'all', status: 'all', query: '', ...details };
}

describe('parsing roster URL params with safe fallbacks', () => {
  it('falls back to the all view for an absent or unknown value', () => {
    expect(parseRosterView(null)).toBe('all');
    expect(parseRosterView('bogus')).toBe('all');
    expect(parseRosterView('active')).toBe('active');
  });

  it('falls back to the all status for an absent or unknown value', () => {
    expect(parseRosterStatus(null)).toBe('all');
    expect(parseRosterStatus('bogus')).toBe('all');
    expect(parseRosterStatus('Paid')).toBe('Paid');
  });

  it("never accepts a status outside this page's vocabulary", () => {
    expect(parseRosterStatus('Call held')).toBe('all');
    expect(parseRosterStatus('Payment link sent')).toBe('all');
  });

  it('falls back to the joined sort key for an absent or unknown value', () => {
    expect(parseRosterSortKey(null)).toBe('joined');
    expect(parseRosterSortKey('bogus')).toBe('joined');
    expect(parseRosterSortKey('name')).toBe('name');
  });

  it('defaults joined to descending and every other key to ascending', () => {
    expect(defaultRosterSortDirectionFor('joined')).toBe('desc');
    expect(defaultRosterSortDirectionFor('name')).toBe('asc');
    expect(defaultRosterSortDirectionFor('status')).toBe('asc');
    expect(defaultRosterSortDirectionFor('bundle')).toBe('asc');
  });

  it('falls back to the key default direction for an absent or unknown value', () => {
    expect(parseRosterSortDirection(null, 'joined')).toBe('desc');
    expect(parseRosterSortDirection('sideways', 'name')).toBe('asc');
    expect(parseRosterSortDirection('asc', 'joined')).toBe('asc');
  });
});

describe('view semantics', () => {
  it('matches every status under the all view', () => {
    expect(matchesView(clientStatusNamed('Paid'), 'all')).toBe(true);
    expect(matchesView(clientStatusNamed('Inactive'), 'all')).toBe(true);
  });

  it('matches only Active under the active view', () => {
    expect(matchesView(clientStatusNamed('Active'), 'active')).toBe(true);
    expect(matchesView(clientStatusNamed('Approved'), 'active')).toBe(false);
  });

  it('matches the onboarding statuses under the onboarding view', () => {
    for (const label of [
      'Paid',
      'Invited',
      'Onboarding',
      'Awaiting review',
      'In review',
      'Needs details',
      'Approved',
    ] as const) {
      expect(matchesView(clientStatusNamed(label), 'onboarding')).toBe(true);
    }
    expect(matchesView(clientStatusNamed('Active'), 'onboarding')).toBe(false);
  });

  it('matches Cancelled and Inactive under the inactive view', () => {
    expect(matchesView(clientStatusNamed('Cancelled'), 'inactive')).toBe(true);
    expect(matchesView(clientStatusNamed('Inactive'), 'inactive')).toBe(true);
    expect(matchesView(clientStatusNamed('Active'), 'inactive')).toBe(false);
  });
});

describe('filtering roster rows', () => {
  it('narrows by view, status and search together', () => {
    const rows = [
      row({ id: 'a', name: 'Ann Active', status: clientStatusNamed('Active') }),
      row({ id: 'b', name: 'Bea Paid', status: clientStatusNamed('Paid') }),
      row({
        id: 'c',
        name: 'Cara Inactive',
        status: clientStatusNamed('Inactive'),
      }),
    ];

    expect(
      rowsMatching(rows, selecting({ view: 'onboarding' })).map((r) => r.id),
    ).toEqual(['b']);
    expect(
      rowsMatching(rows, selecting({ status: 'Active' })).map((r) => r.id),
    ).toEqual(['a']);
    expect(
      rowsMatching(rows, selecting({ query: 'cara' })).map((r) => r.id),
    ).toEqual(['c']);
  });

  it('matches by name or email, case-insensitively', () => {
    const rows = [
      row({ id: 'a', name: 'Ann Active', email: 'ann@example.com' }),
    ];

    expect(
      rowsMatching(rows, selecting({ query: 'ANN@EXAMPLE' })).map((r) => r.id),
    ).toEqual(['a']);
    expect(rowsMatching(rows, selecting({ query: 'nope' }))).toHaveLength(0);
  });
});

describe('counting rows per status', () => {
  it('ignores the status filter itself while respecting the current view and search', () => {
    const rows = [
      row({ id: 'a', name: 'Ann Active', status: clientStatusNamed('Active') }),
      row({ id: 'b', name: 'Bea Paid', status: clientStatusNamed('Paid') }),
      row({ id: 'c', name: 'Cel Paid', status: clientStatusNamed('Paid') }),
    ];

    const counts = countsByStatus(
      rows,
      selecting({ status: 'Active', view: 'onboarding' }),
    );

    expect(counts.Paid).toBe(2);
    expect(counts.Active).toBe(0);
    expect(counts.all).toBe(2);
  });
});

describe('sorting by client name', () => {
  const rows = [
    row({ id: 'a', name: 'Zed Zephyr', email: 'zed@example.com' }),
    row({ id: 'b', name: 'Ann Active', email: 'ann@example.com' }),
  ];

  it('sorts A to Z ascending', () => {
    expect(
      sortRows(rows, { key: 'name', direction: 'asc' }).map((r) => r.id),
    ).toEqual(['b', 'a']);
  });

  it('sorts Z to A descending', () => {
    expect(
      sortRows(rows, { key: 'name', direction: 'desc' }).map((r) => r.id),
    ).toEqual(['a', 'b']);
  });

  it('breaks ties on email', () => {
    const tied = [
      row({ id: 'a', name: 'Ann Active', email: 'zzz@example.com' }),
      row({ id: 'b', name: 'Ann Active', email: 'aaa@example.com' }),
    ];
    expect(
      sortRows(tied, { key: 'name', direction: 'asc' }).map((r) => r.id),
    ).toEqual(['b', 'a']);
  });
});

describe('sorting by status vocabulary position', () => {
  const rows = [
    row({ id: 'a', status: clientStatusNamed('Active') }),
    row({ id: 'b', status: clientStatusNamed('Paid') }),
    row({ id: 'c', status: clientStatusNamed('Inactive') }),
  ];

  it('orders earliest journey stage first ascending', () => {
    expect(
      sortRows(rows, { key: 'status', direction: 'asc' }).map((r) => r.id),
    ).toEqual(['b', 'a', 'c']);
  });

  it('reverses for descending', () => {
    expect(
      sortRows(rows, { key: 'status', direction: 'desc' }).map((r) => r.id),
    ).toEqual(['c', 'a', 'b']);
  });
});

describe('sorting by bundle', () => {
  const rows = [
    row({ id: 'a', bundleLabel: '6 months' }),
    row({ id: 'b', bundleLabel: '—' }),
    row({ id: 'c', bundleLabel: '1 month' }),
  ];

  it('sorts alphabetically ascending with the placeholder last', () => {
    expect(
      sortRows(rows, { key: 'bundle', direction: 'asc' }).map((r) => r.id),
    ).toEqual(['c', 'a', 'b']);
  });

  it('sorts alphabetically descending with the placeholder still last', () => {
    expect(
      sortRows(rows, { key: 'bundle', direction: 'desc' }).map((r) => r.id),
    ).toEqual(['a', 'c', 'b']);
  });
});

describe('sorting by join date', () => {
  const rows = [
    row({ id: 'a', joinedAt: new Date('2025-06-01') }),
    row({ id: 'b', joinedAt: null }),
    row({ id: 'c', joinedAt: new Date('2025-01-01') }),
  ];

  it('sorts oldest first ascending with the null last', () => {
    expect(
      sortRows(rows, { key: 'joined', direction: 'asc' }).map((r) => r.id),
    ).toEqual(['c', 'a', 'b']);
  });

  it('sorts newest first descending with the null still last', () => {
    expect(
      sortRows(rows, { key: 'joined', direction: 'desc' }).map((r) => r.id),
    ).toEqual(['a', 'c', 'b']);
  });
});

describe('detecting active filters', () => {
  it('is false only when view, status and query are all at their defaults', () => {
    expect(hasActiveRosterFilters(selecting())).toBe(false);
    expect(hasActiveRosterFilters(selecting({ view: 'active' }))).toBe(true);
    expect(hasActiveRosterFilters(selecting({ status: 'Paid' }))).toBe(true);
    expect(hasActiveRosterFilters(selecting({ query: 'ann' }))).toBe(true);
  });
});

describe('the empty roster message', () => {
  it('prefers the search message when a query is present', () => {
    expect(
      emptyRosterMessage(
        selecting({ query: 'zzz', view: 'active', status: 'Paid' }),
      ),
    ).toBe('No clients match your search.');
  });

  it('names the view alone when no status is chosen', () => {
    expect(emptyRosterMessage(selecting({ view: 'inactive' }))).toBe(
      'No inactive clients.',
    );
  });

  it('names the view and the chosen status together', () => {
    expect(
      emptyRosterMessage(selecting({ view: 'active', status: 'Paid' })),
    ).toBe('No active clients match the Paid status.');
  });
});
