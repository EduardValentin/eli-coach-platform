export type SortDirection = "asc" | "desc";

export type SortChoice<Key extends string> = {
  direction: SortDirection;
  key: Key;
};

export type SortRule<Key extends string> = {
  defaultDirection: Record<Key, SortDirection>;
  fallback: Key;
};

type SortParams = { dir: string | null; sort: string | null };

export function parseSort<Key extends string>(
  rule: SortRule<Key>,
  rawKey: string | null,
  rawDirection: string | null,
): SortChoice<Key> {
  const key = isSortKey(rule, rawKey) ? rawKey : rule.fallback;
  const direction =
    rawDirection === "asc" || rawDirection === "desc"
      ? rawDirection
      : rule.defaultDirection[key];

  return { direction, key };
}

export function sortParams<Key extends string>(
  rule: SortRule<Key>,
  sort: SortChoice<Key>,
): SortParams {
  return {
    dir:
      sort.direction === rule.defaultDirection[sort.key]
        ? null
        : sort.direction,
    sort: sort.key === rule.fallback ? null : sort.key,
  };
}

export function headerSort<Key extends string>(
  rule: SortRule<Key>,
  current: SortChoice<Key>,
  key: Key,
): SortChoice<Key> {
  if (key !== current.key) {
    return { direction: rule.defaultDirection[key], key };
  }

  return { direction: current.direction === "asc" ? "desc" : "asc", key };
}

function isSortKey<Key extends string>(
  rule: SortRule<Key>,
  raw: string | null,
): raw is Key {
  return raw !== null && Object.hasOwn(rule.defaultDirection, raw);
}
