import {
  defaultResourceSortDirection,
  RESOURCE_SORT_KEYS,
  type ResourceSortKey,
} from "@eli-coach-platform/domain/client-resources";
import {
  SortControl,
  type SortChoice,
  type SortOption,
} from "@eli-coach-platform/ui/filters";

import type { ResourceToolbarControlSize } from "~/features/client-resources/ui/shared/resources/resource-toolbar";

const SORT_PRESENTATION: Record<
  ResourceSortKey,
  Pick<SortOption<ResourceSortKey>, "directionLabels" | "label" | "order">
> = {
  added: {
    directionLabels: { asc: "Oldest first", desc: "Newest first" },
    label: "Date added",
    order: "chronological",
  },
  title: {
    directionLabels: { asc: "A to Z", desc: "Z to A" },
    label: "Title",
    order: "alphabetical",
  },
};

const RESOURCE_SORT_OPTIONS: readonly SortOption<ResourceSortKey>[] =
  RESOURCE_SORT_KEYS.map((key) => ({
    ...SORT_PRESENTATION[key],
    defaultDirection: defaultResourceSortDirection(key),
    key,
  }));

type ResourceSortControlProps = {
  sort: SortChoice<ResourceSortKey>;
  onChange: (sort: SortChoice<ResourceSortKey>) => void;
  size: ResourceToolbarControlSize;
};

export function ResourceSortControl({
  sort,
  onChange,
  size,
}: ResourceSortControlProps) {
  return (
    <SortControl
      className="col-span-2 md:w-64"
      onChange={onChange}
      options={RESOURCE_SORT_OPTIONS}
      size={size}
      sort={sort}
    />
  );
}
