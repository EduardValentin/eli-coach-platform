import {
  type ClientStatus,
  type ClientStatusLabel,
} from '../domain/clientStatus';

export type RosterStatus = Extract<ClientStatusLabel, 'Active' | 'Inactive'>;

export type RosterStatusOption = ClientStatusLabel | 'all';

const ROSTER_STATUS_VOCABULARY: readonly ClientStatusLabel[] = [
  'Paid',
  'Invited',
  'Onboarding',
  'Awaiting review',
  'In review',
  'Needs details',
  'Approved',
  'Active',
  'Cancelled',
  'Inactive',
];

export const ROSTER_STATUS_OPTIONS: readonly RosterStatusOption[] = [
  'all',
  ...ROSTER_STATUS_VOCABULARY,
];

export type RosterSortKey = 'name' | 'status' | 'bundle' | 'joined';

export type RosterSortDirection = 'asc' | 'desc';

export type RosterSort = { key: RosterSortKey; direction: RosterSortDirection };

const ROSTER_SORT_KEYS: readonly RosterSortKey[] = [
  'name',
  'status',
  'bundle',
  'joined',
];

export type RosterRow = {
  id: string;
  name: string;
  email: string;
  status: ClientStatus;
  bundleLabel: string;
  joinedAt: Date | null;
  detailPath: string;
  actionLabel: string;
  avatarUrl?: string;
  terminable?: { status: RosterStatus };
};

export type RosterSelection = {
  status: RosterStatusOption;
  query: string;
};

export function parseRosterStatus(raw: string | null): RosterStatusOption {
  return ROSTER_STATUS_OPTIONS.find((option) => option === raw) ?? 'all';
}

export function parseRosterSortKey(raw: string | null): RosterSortKey {
  return ROSTER_SORT_KEYS.find((key) => key === raw) ?? 'joined';
}

export function defaultRosterSortDirectionFor(
  key: RosterSortKey,
): RosterSortDirection {
  return key === 'joined' ? 'desc' : 'asc';
}

export function parseRosterSortDirection(
  raw: string | null,
  key: RosterSortKey,
): RosterSortDirection {
  if (raw === 'asc' || raw === 'desc') return raw;
  return defaultRosterSortDirectionFor(key);
}

function matchesStatus(
  status: ClientStatus,
  option: RosterStatusOption,
): boolean {
  return option === 'all' || status.label === option;
}

function matchesQuery(row: RosterRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  return [row.name, row.email].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function rowsMatching(
  rows: RosterRow[],
  selection: RosterSelection,
): RosterRow[] {
  return rows.filter(
    (row) =>
      matchesStatus(row.status, selection.status) &&
      matchesQuery(row, selection.query),
  );
}

export function countsByStatus(
  rows: RosterRow[],
  selection: RosterSelection,
): Record<RosterStatusOption, number> {
  const counts = {} as Record<RosterStatusOption, number>;

  for (const option of ROSTER_STATUS_OPTIONS) {
    counts[option] = rowsMatching(rows, {
      ...selection,
      status: option,
    }).length;
  }

  return counts;
}

function compareText(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: 'base' });
}

function statusVocabularyIndex(label: ClientStatusLabel): number {
  return ROSTER_STATUS_VOCABULARY.indexOf(label);
}

function applyDirection<Row>(
  ascending: Row[],
  direction: RosterSortDirection,
): Row[] {
  return direction === 'asc' ? ascending : [...ascending].reverse();
}

function sortedRowsBy(
  rows: RosterRow[],
  compareAscending: (one: RosterRow, other: RosterRow) => number,
  direction: RosterSortDirection,
): RosterRow[] {
  return applyDirection([...rows].sort(compareAscending), direction);
}

function placeholderLastBy(
  rows: RosterRow[],
  hasValue: (row: RosterRow) => boolean,
  compareAscending: (one: RosterRow, other: RosterRow) => number,
  direction: RosterSortDirection,
): RosterRow[] {
  const valued = sortedRowsBy(
    rows.filter(hasValue),
    compareAscending,
    direction,
  );
  const placeholders = rows.filter((row) => !hasValue(row));

  return [...valued, ...placeholders];
}

export function sortRows(rows: RosterRow[], sort: RosterSort): RosterRow[] {
  switch (sort.key) {
    case 'name':
      return sortedRowsBy(
        rows,
        (one, other) =>
          compareText(one.name, other.name) ||
          compareText(one.email, other.email),
        sort.direction,
      );
    case 'status':
      return sortedRowsBy(
        rows,
        (one, other) =>
          statusVocabularyIndex(one.status.label) -
          statusVocabularyIndex(other.status.label),
        sort.direction,
      );
    case 'bundle':
      return placeholderLastBy(
        rows,
        (row) => row.bundleLabel !== '—',
        (one, other) => compareText(one.bundleLabel, other.bundleLabel),
        sort.direction,
      );
    case 'joined':
      return placeholderLastBy(
        rows,
        (row) => row.joinedAt !== null,
        (one, other) =>
          (one.joinedAt as Date).getTime() - (other.joinedAt as Date).getTime(),
        sort.direction,
      );
  }
}

export function hasActiveRosterFilters(selection: RosterSelection): boolean {
  return selection.status !== 'all' || selection.query.trim().length > 0;
}

export function emptyRosterMessage(selection: RosterSelection): string {
  const hasStatus = selection.status !== 'all';
  const hasQuery = selection.query.trim().length > 0;

  if (hasStatus && hasQuery) {
    return `No clients match the ${selection.status} status and your search.`;
  }
  if (hasStatus) return `No clients match the ${selection.status} status.`;
  if (hasQuery) return 'No clients match your search.';

  return 'No clients match your filters.';
}
