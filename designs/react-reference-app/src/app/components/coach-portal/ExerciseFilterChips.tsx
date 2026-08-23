import { ToggleChip } from '../ToggleChip';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  EXERCISE_TAGS,
  NO_EQUIPMENT_FILTER,
  type ExerciseFilter,
} from '../../utils/exerciseFilters';

interface ExerciseFilterChipsProps {
  activeFilters: ExerciseFilter[];
  onToggleFilter: (filter: ExerciseFilter) => void;
  /** Supply to offer a clear action; omitted where the surface has no room for one. */
  onClearFilters?: () => void;
  /** Distinguishes the switch's label association where both surfaces mount at once. */
  idPrefix?: string;
}

/**
 * The exercise-library filter controls, shared by the Training Hub's Exercise
 * Library tab and the plan builder's library panel so both narrow the library
 * by the same vocabulary.
 *
 * Goals are chips because a coach picks any number of three; the equipment
 * condition is a switch because it is one yes/no whose off state is "no
 * constraint" rather than a third choice.
 */
export function ExerciseFilterChips({
  activeFilters,
  onToggleFilter,
  onClearFilters,
  idPrefix = 'exercise-filters',
}: ExerciseFilterChipsProps) {
  const noEquipmentId = `${idPrefix}-no-equipment`;

  return (
    <div className="space-y-3">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Goals
        </legend>
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

      <div className="flex items-center gap-2">
        <Switch
          id={noEquipmentId}
          checked={activeFilters.includes(NO_EQUIPMENT_FILTER)}
          onCheckedChange={() => onToggleFilter(NO_EQUIPMENT_FILTER)}
          // The primitive's default checked tone is near-black; an active filter
          // here reads as brand, like the goal chips beside it.
          className="data-[state=checked]:bg-brand"
        />
        <Label htmlFor={noEquipmentId} className="text-xs font-medium text-muted-foreground">
          No equipment only
        </Label>
      </div>

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
