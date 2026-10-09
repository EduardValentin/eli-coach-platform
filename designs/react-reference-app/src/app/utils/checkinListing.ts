import {
  awaitsResponseFrom,
  checkinStartsAt,
  type CheckIn,
  type CheckinKind,
  type CheckinParty,
} from '../domain/checkins';
import type { SortDirection } from '../components/SortControl';

export type CheckinTab = 'upcoming' | 'requests' | 'past';

export type KindFilter = 'any' | CheckinKind;

export type WaitingFilter = 'any' | 'you' | 'them';

export type CheckinSelection = {
  kind: KindFilter;
  waiting: WaitingFilter;
  query: string;
};

const CHECKIN_TABS: readonly CheckinTab[] = ['upcoming', 'requests', 'past'];

const KIND_FILTERS: readonly KindFilter[] = [
  'any',
  'recurring',
  'ad-hoc',
  'program-review',
];

const WAITING_FILTERS: readonly WaitingFilter[] = ['any', 'you', 'them'];

export function parseTab(raw: string | null, fallback: CheckinTab): CheckinTab {
  return CHECKIN_TABS.find((tab) => tab === raw) ?? fallback;
}

export function parseKindFilter(raw: string | null): KindFilter {
  return KIND_FILTERS.find((kind) => kind === raw) ?? 'any';
}

export function parseWaitingFilter(raw: string | null): WaitingFilter {
  return WAITING_FILTERS.find((waiting) => waiting === raw) ?? 'any';
}

export function defaultDirectionFor(tab: CheckinTab): SortDirection {
  return tab === 'past' ? 'desc' : 'asc';
}

export function parseDirection(
  raw: string | null,
  tab: CheckinTab,
): SortDirection {
  if (raw === 'asc' || raw === 'desc') return raw;
  return defaultDirectionFor(tab);
}

export function hasActiveFilters(selection: CheckinSelection): boolean {
  return (
    selection.kind !== 'any' ||
    selection.waiting !== 'any' ||
    selection.query.trim().length > 0
  );
}

function awaitsViewer(checkin: CheckIn, party: CheckinParty): boolean {
  return awaitsResponseFrom(checkin) === party;
}

function matchesWaiting(
  checkin: CheckIn,
  waiting: WaitingFilter,
  party: CheckinParty,
): boolean {
  if (waiting === 'any') return true;
  return awaitsViewer(checkin, party) === (waiting === 'you');
}

function matchesQuery(checkin: CheckIn, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle.length === 0 || checkin.clientName.toLowerCase().includes(needle);
}

function matches(
  checkin: CheckIn,
  selection: CheckinSelection,
  party: CheckinParty,
): boolean {
  return (
    (selection.kind === 'any' || checkin.kind === selection.kind) &&
    matchesWaiting(checkin, selection.waiting, party) &&
    matchesQuery(checkin, selection.query)
  );
}

export function filterCheckins(
  checkins: CheckIn[],
  selection: CheckinSelection,
  party: CheckinParty,
): CheckIn[] {
  return checkins.filter((checkin) => matches(checkin, selection, party));
}

export function countsByKind(
  checkins: CheckIn[],
  selection: CheckinSelection,
  party: CheckinParty,
): Record<KindFilter, number> {
  const count = (kind: KindFilter) =>
    filterCheckins(checkins, { ...selection, kind }, party).length;

  return {
    any: count('any'),
    recurring: count('recurring'),
    'ad-hoc': count('ad-hoc'),
    'program-review': count('program-review'),
  };
}

export function countsByWaiting(
  checkins: CheckIn[],
  selection: CheckinSelection,
  party: CheckinParty,
): Record<WaitingFilter, number> {
  const count = (waiting: WaitingFilter) =>
    filterCheckins(checkins, { ...selection, waiting }, party).length;

  return { any: count('any'), you: count('you'), them: count('them') };
}

export function orderCheckins(
  checkins: CheckIn[],
  order: { tab: CheckinTab; direction: SortDirection; party: CheckinParty },
): CheckIn[] {
  const sign = order.direction === 'asc' ? 1 : -1;
  const byDate = (a: CheckIn, b: CheckIn) =>
    sign * (checkinStartsAt(a).getTime() - checkinStartsAt(b).getTime());
  const answerRank = (checkin: CheckIn) =>
    order.tab === 'requests' && awaitsViewer(checkin, order.party) ? 0 : 1;

  return [...checkins].sort(
    (a, b) => answerRank(a) - answerRank(b) || byDate(a, b),
  );
}
