import { ToggleChipGroup, ToggleChipGroupItem } from "@eli-coach-platform/ui";
import { Filter } from "lucide-react";
import type { StoreProduct } from "~/features/store/contracts/store";

import type {
  StoreCatalogFilterDimensions,
  StoreCatalogFilterSelection,
} from "./catalog-filters";

// The chip standing for "no filter on this dimension". It never reaches the
// URL: choosing it removes the dimension's parameter instead.
const UNFILTERED_VALUE = "all";

export function StoreCatalogFilters(props: {
  dimensions: StoreCatalogFilterDimensions;
  onSelectGoal: (goal: string | null) => void;
  onSelectType: (type: string | null) => void;
  selection: StoreCatalogFilterSelection;
}) {
  return (
    <div className="mb-16">
      <p className="mb-4 flex items-center gap-2 text-label text-text-muted">
        <Filter aria-hidden="true" size={16} />
        Filters
      </p>
      <div className="flex flex-col gap-3">
        <CatalogFilterRow
          label="Type"
          onSelect={props.onSelectType}
          selectedSlug={props.selection.type}
          tone="brand"
          values={props.dimensions.types}
        />
        <CatalogFilterRow
          label="Goal"
          onSelect={props.onSelectGoal}
          selectedSlug={props.selection.goal}
          tone="brand-secondary"
          values={props.dimensions.goals}
        />
      </div>
    </div>
  );
}

function CatalogFilterRow(props: {
  label: string;
  onSelect: (slug: string | null) => void;
  selectedSlug: string | null;
  tone: "brand" | "brand-secondary";
  values: readonly StoreProduct["types"][number][];
}) {
  if (props.values.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-12 shrink-0 text-label text-text-muted">
        {props.label}
      </span>
      <ToggleChipGroup
        aria-label={`Filter by ${props.label}`}
        onValueChange={(value) =>
          props.onSelect(value === UNFILTERED_VALUE ? null : value)
        }
        value={props.selectedSlug ?? UNFILTERED_VALUE}
      >
        <ToggleChipGroupItem tone={props.tone} value={UNFILTERED_VALUE}>
          All
        </ToggleChipGroupItem>
        {props.values.map((value) => (
          <ToggleChipGroupItem key={value.slug} tone={props.tone} value={value.slug}>
            {value.label}
          </ToggleChipGroupItem>
        ))}
      </ToggleChipGroup>
    </div>
  );
}
