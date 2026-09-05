import { EXERCISE_TAGS } from "@eli-coach-platform/domain";
import { ToggleChip } from "@eli-coach-platform/ui";

import { ClearFiltersButton } from "./clear-filters-button";
import { NO_EQUIPMENT_FILTER, type ExerciseFilter } from "./exercise-filtering";

type ExerciseFiltersProps = {
  activeFilters: readonly ExerciseFilter[];
  onClearFilters: () => void;
  onToggleFilter: (filter: ExerciseFilter) => void;
};

const GROUP_HEADING_CLASS = "mb-2 text-label font-bold uppercase tracking-wide text-text-muted";

export function ExerciseFilters(props: ExerciseFiltersProps) {
  const { activeFilters, onClearFilters, onToggleFilter } = props;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="min-w-0">
        <legend className={GROUP_HEADING_CLASS}>Tags</legend>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_TAGS.map((tag) => (
            <ToggleChip
              key={tag}
              onPressedChange={() => onToggleFilter(tag)}
              pressed={activeFilters.includes(tag)}
            >
              {tag}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className={GROUP_HEADING_CLASS}>Equipment</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip
            onPressedChange={() => onToggleFilter(NO_EQUIPMENT_FILTER)}
            pressed={activeFilters.includes(NO_EQUIPMENT_FILTER)}
          >
            {NO_EQUIPMENT_FILTER}
          </ToggleChip>
        </div>
      </fieldset>
      <ClearFiltersButton onClear={onClearFilters} />
    </div>
  );
}
