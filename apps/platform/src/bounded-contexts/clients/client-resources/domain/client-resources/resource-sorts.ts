export const RESOURCE_SORT_KEYS = ["added", "title"] as const;
export const RESOURCE_SORT_DIRECTIONS = ["asc", "desc"] as const;

export type ResourceSortKey = (typeof RESOURCE_SORT_KEYS)[number];
export type ResourceSortDirection = (typeof RESOURCE_SORT_DIRECTIONS)[number];

const DEFAULT_RESOURCE_SORT_DIRECTIONS: Record<
  ResourceSortKey,
  ResourceSortDirection
> = { added: "desc", title: "asc" };

export function defaultResourceSortDirection(
  key: ResourceSortKey,
): ResourceSortDirection {
  return DEFAULT_RESOURCE_SORT_DIRECTIONS[key];
}
