import type { SortChoice, SortDirection } from '../components/SortControl';

export const LIBRARY_ITEMS_PER_PAGE = 10;

export const STATUS_LABELS = { active: 'Active', archived: 'Archived' } as const;

export type SortRule<Key extends string> = {
  fallback: Key;
  defaultDirection: Record<Key, SortDirection>;
};

export function parseSort<Key extends string>(
  rule: SortRule<Key>,
  rawKey: string | null,
  rawDirection: string | null,
): SortChoice<Key> {
  const key =
    rawKey !== null && rawKey in rule.defaultDirection ? (rawKey as Key) : rule.fallback;
  const direction =
    rawDirection === 'asc' || rawDirection === 'desc'
      ? rawDirection
      : rule.defaultDirection[key];
  return { key, direction };
}

export function sortParams<Key extends string>(
  rule: SortRule<Key>,
  sort: SortChoice<Key>,
): { sort: string | null; dir: string | null } {
  return {
    sort: sort.key === rule.fallback ? null : sort.key,
    dir: sort.direction === rule.defaultDirection[sort.key] ? null : sort.direction,
  };
}

export function headerSort<Key extends string>(
  rule: SortRule<Key>,
  current: SortChoice<Key>,
  key: Key,
): SortChoice<Key> {
  if (key !== current.key) return { key, direction: rule.defaultDirection[key] };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function orderBy<Item, Key extends string>(
  items: readonly Item[],
  sort: SortChoice<Key>,
  compare: Record<Key, (one: Item, other: Item) => number>,
): Item[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...items].sort((one, other) => compare[sort.key](one, other) * factor);
}

export function toggled<Value>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

export function knownValues<Value extends string>(
  raw: readonly string[],
  allowed: readonly Value[],
): Value[] {
  return raw.filter((value): value is Value => (allowed as readonly string[]).includes(value));
}

export function countsFor<Value extends string, Item>(
  values: readonly Value[],
  items: readonly Item[],
  holds: (item: Item, value: Value) => boolean,
): Record<Value, number> {
  return Object.fromEntries(
    values.map((value) => [value, items.filter((item) => holds(item, value)).length]),
  ) as Record<Value, number>;
}

export function matchesQuery(text: readonly string[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return text.some((candidate) => candidate.toLowerCase().includes(needle));
}
