import { ToggleChip } from '../ToggleChip';
import {
  EXERCISE_TAGS,
  NO_EQUIPMENT_FILTER,
  type ExerciseFilter,
} from '../../utils/exerciseFilters';

interface ExerciseFiltersProps {
  activeFilters: ExerciseFilter[];
  onToggleFilter: (filter: ExerciseFilter) => void;
  /** Supply to offer a clear action; omitted where the surface has no room for one. */
  onClearFilters?: () => void;
  /** The clear action also resets the surface's search, which only it can know about. */
  hasSearchQuery?: boolean;
}

const GROUP_HEADING = 'mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider';

/**
 * The exercise-library filters, shared by the Training Hub's Exercise Library
 * tab and the plan builder's library panel so both narrow the library by the
 * same vocabulary.
 *
 * Every control is a pressable chip. The equipment condition is one chip rather
 * than a pair, because its unpressed state means "no constraint" rather than a
 * second choice.
 */
export function ExerciseFilters({
  activeFilters,
  onToggleFilter,
  onClearFilters,
  hasSearchQuery = false,
}: ExerciseFiltersProps) {
  const hasSomethingToClear = activeFilters.length > 0 || hasSearchQuery;

  return (
    <div className="space-y-3">
      <fieldset className="min-w-0">
        <legend className={GROUP_HEADING}>Tags</legend>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_TAGS.map(tag => (
            <ToggleChip
              key={tag}
              pressed={activeFilters.includes(tag)}
              onPressedChange={() => onToggleFilter(tag)}
            >
              {tag}
            </ToggleChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className={GROUP_HEADING}>Equipment</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip
            pressed={activeFilters.includes(NO_EQUIPMENT_FILTER)}
            onPressedChange={() => onToggleFilter(NO_EQUIPMENT_FILTER)}
          >
            {NO_EQUIPMENT_FILTER}
          </ToggleChip>
        </div>
      </fieldset>

      {onClearFilters && (
        // `aria-disabled` rather than `disabled`: a browser blurs an element the
        // moment it becomes disabled, so clearing from the keyboard would throw
        // focus to the document body. This keeps the control focusable and in
        // the tab order while it has nothing to do.
        <button
          type="button"
          onClick={() => {
            if (!hasSomethingToClear) return;
            onClearFilters();
          }}
          aria-disabled={!hasSomethingToClear}
          className="-mx-2 min-h-6 px-2 text-xs font-semibold text-brand hover:text-brand-hover aria-disabled:text-muted-foreground aria-disabled:hover:text-muted-foreground"
        >
          Clear search and filters
        </button>
      )}
    </div>
  );
}
