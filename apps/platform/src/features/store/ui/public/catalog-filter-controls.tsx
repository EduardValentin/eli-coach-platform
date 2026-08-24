import { FilterChip, FilterChipGroup } from "@eli-coach-platform/ui";
import { Filter } from "lucide-react";
import { useCallback, useRef } from "react";

import type {
  StoreCatalogFilterDimension,
  StoreCatalogFilterSelection,
  StoreFilterParam,
} from "./catalog-filters";

// The chip standing for "no filter on this dimension". It never reaches the
// URL: choosing it removes the dimension's parameter instead. Underscores are
// outside the alphabet `productSlugSchema` allows a taxonomy slug, so this can
// never collide with a real value — `all` itself is one that schema accepts.
const UNFILTERED_VALUE = "__all__";

export function useStoreCatalogFilterFocus() {
  const chipsRef = useRef<HTMLDivElement>(null);

  // Named rather than a DOM query from the caller: what marks the chosen chip
  // is the chip primitive's business, and a caller reaching for it by
  // attribute would break silently the day that changes.
  const focusSelection = useCallback(() => {
    chipsRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.focus();
  }, []);

  return { chipsRef, focusSelection };
}

export function StoreCatalogFilters(props: {
  chipsRef: React.RefObject<HTMLDivElement | null>;
  dimensions: readonly StoreCatalogFilterDimension[];
  onSelect: (param: StoreFilterParam, slug: string | null) => void;
  selection: StoreCatalogFilterSelection;
}) {
  return (
    <div className="mb-16" ref={props.chipsRef}>
      <p className="mb-4 flex items-center gap-2 text-label uppercase text-text-muted">
        <Filter aria-hidden="true" size={16} />
        Filters
      </p>
      <div className="flex flex-col gap-3">
        {props.dimensions.map((dimension) => (
          <CatalogFilterRow
            dimension={dimension}
            key={dimension.descriptor.param}
            onSelect={props.onSelect}
            selectedSlug={props.selection[dimension.descriptor.param]}
          />
        ))}
      </div>
    </div>
  );
}

function CatalogFilterRow(props: {
  dimension: StoreCatalogFilterDimension;
  onSelect: (param: StoreFilterParam, slug: string | null) => void;
  selectedSlug: string | null;
}) {
  const { descriptor, values } = props.dimension;

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-12 shrink-0 text-label uppercase text-text-muted">
        {descriptor.label}
      </span>
      <FilterChipGroup
        aria-label={`Filter by ${descriptor.label}`}
        onValueChange={(value) =>
          props.onSelect(
            descriptor.param,
            value === UNFILTERED_VALUE ? null : value,
          )
        }
        tone={descriptor.tone}
        value={props.selectedSlug ?? UNFILTERED_VALUE}
      >
        <FilterChip value={UNFILTERED_VALUE}>All</FilterChip>
        {values.map((value) => (
          <FilterChip key={value.slug} value={value.slug}>
            {value.label}
          </FilterChip>
        ))}
      </FilterChipGroup>
    </div>
  );
}
