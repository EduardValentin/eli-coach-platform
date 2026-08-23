import { useId } from 'react';
import { ToggleChip } from '../ToggleChip';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
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
}

const GROUP_HEADING = 'mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider';

/**
 * The exercise-library filters, shared by the Training Hub's Exercise Library
 * tab and the plan builder's library panel so both narrow the library by the
 * same vocabulary.
 *
 * Tags are chips because a coach picks any number of three; the equipment
 * condition is a switch because it is one yes/no whose off state is "no
 * constraint" rather than a third choice.
 */
export function ExerciseFilters({
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: ExerciseFiltersProps) {
  // Both surfaces can render this component, so the label association cannot
  // rely on a hand-written id being unique.
  const noEquipmentId = useId();

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

      <div>
        <p className={GROUP_HEADING}>Equipment</p>
        <div className="flex items-center gap-2">
          <Switch
            id={noEquipmentId}
            checked={activeFilters.includes(NO_EQUIPMENT_FILTER)}
            onCheckedChange={() => onToggleFilter(NO_EQUIPMENT_FILTER)}
          />
          <Label htmlFor={noEquipmentId} className="text-xs leading-none text-muted-foreground">
            No equipment only
          </Label>
        </div>
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
          className="-mx-2 min-h-6 px-2 text-xs font-semibold text-brand hover:text-brand-hover aria-disabled:text-muted-foreground aria-disabled:hover:text-muted-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
