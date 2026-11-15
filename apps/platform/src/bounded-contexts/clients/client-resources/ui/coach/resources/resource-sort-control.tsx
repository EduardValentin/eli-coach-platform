import {
  defaultResourceSortDirection,
  RESOURCE_SORT_KEYS,
  type ResourceSortKey,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import {
  SortControl,
  type SortOption,
  type SortToggleSize,
} from "~/shared/design-system/filters";
import type { SortChoice } from "~/shared/design-system/lib";

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
  toggleSize: SortToggleSize;
};

export function ResourceSortControl({
  sort,
  onChange,
  toggleSize,
}: ResourceSortControlProps) {
  return (
    <SortControl
      className="col-span-2 md:w-64"
      onChange={onChange}
      options={RESOURCE_SORT_OPTIONS}
      size={toggleSize}
      sort={sort}
    />
  );
}
