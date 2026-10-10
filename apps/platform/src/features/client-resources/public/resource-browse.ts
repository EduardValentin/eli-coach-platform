import {
  defaultResourceSortDirection,
  type ResourceBrowseInput,
  type ResourceSortDirection,
  type ResourceSortKey,
} from "@eli-coach-platform/domain/client-resources";

export const RESOURCE_BROWSE_PARAMS = {
  tag: "tag",
  search: "q",
  sort: "sort",
  direction: "dir",
} as const;

export type ResourceBrowseView = {
  tag: string | null;
  search: string;
  sort: ResourceSortKey;
  direction: ResourceSortDirection;
};

export function resourceBrowseInputOf(
  searchParams: URLSearchParams,
): ResourceBrowseInput {
  return {
    tag: searchParams.get(RESOURCE_BROWSE_PARAMS.tag),
    search: searchParams.get(RESOURCE_BROWSE_PARAMS.search),
    sort: searchParams.get(RESOURCE_BROWSE_PARAMS.sort),
    direction: searchParams.get(RESOURCE_BROWSE_PARAMS.direction),
  };
}

export function writeResourceBrowse(
  params: URLSearchParams,
  browse: ResourceBrowseView,
): void {
  writeParam(params, RESOURCE_BROWSE_PARAMS.tag, browse.tag);
  writeParam(
    params,
    RESOURCE_BROWSE_PARAMS.search,
    browse.search.trim() === "" ? null : browse.search,
  );
  writeParam(
    params,
    RESOURCE_BROWSE_PARAMS.sort,
    browse.sort === "added" ? null : browse.sort,
  );
  writeParam(
    params,
    RESOURCE_BROWSE_PARAMS.direction,
    browse.direction === defaultResourceSortDirection(browse.sort)
      ? null
      : browse.direction,
  );
}

function writeParam(
  params: URLSearchParams,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    params.delete(name);
    return;
  }

  params.set(name, value);
}
