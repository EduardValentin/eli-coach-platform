import { ToggleChip } from '../ToggleChip';
import {
  EQUIPMENT_FILTERS,
  EXERCISE_TAGS,
  type ExerciseFilter,
} from '../../utils/exerciseFilters';

interface ExerciseFilterChipsProps {
  activeFilters: ExerciseFilter[];
  onToggleFilter: (filter: ExerciseFilter) => void;
  /** Supply to offer a clear action; omitted where the surface has no room for one. */
  onClearFilters?: () => void;
}

function FilterGroup({
  legend,
  options,
  activeFilters,
  onToggleFilter,
}: {
  legend: string;
  options: readonly ExerciseFilter[];
  activeFilters: ExerciseFilter[];
  onToggleFilter: (filter: ExerciseFilter) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <ToggleChip
            key={option}
            pressed={activeFilters.includes(option)}
            onPressedChange={() => onToggleFilter(option)}
          >
            {option}
          </ToggleChip>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The exercise-library filter controls, shared by the Training Hub's Exercise
 * Library tab and the plan builder's library panel so both narrow the library
 * by the same vocabulary.
 */
export function ExerciseFilterChips({
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: ExerciseFilterChipsProps) {
  return (
    <div className="space-y-3">
      <FilterGroup
        legend="Goals"
        options={EXERCISE_TAGS}
        activeFilters={activeFilters}
        onToggleFilter={onToggleFilter}
      />
      <FilterGroup
        legend="Equipment"
        options={EQUIPMENT_FILTERS}
        activeFilters={activeFilters}
        onToggleFilter={onToggleFilter}
      />
      {onClearFilters && (
        // `aria-disabled` rather than `disabled`: a browser blurs an element the
        // moment it becomes disabled, so clearing from the keyboard would throw
        // focus to the document body. This keeps the control focusable and in
        // the tab order while it has nothing to do.
        <button
          type="button"
          onClick={() => {
            if (activeFilters.length === 0) return;
            onClearFilters();
          }}
          aria-disabled={activeFilters.length === 0}
          className="text-xs font-semibold text-brand hover:text-brand-hover aria-disabled:text-muted-foreground aria-disabled:hover:text-muted-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
