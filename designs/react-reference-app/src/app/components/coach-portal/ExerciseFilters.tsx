import type { Exercise } from '../../context/TrainingContext';
import {
  EQUIPMENT_FILTERS,
  EQUIPMENT_LABELS,
  EXERCISE_TAGS,
  EXERCISE_TAG_LABELS,
  countsByEquipment,
  countsByTag,
  type ExerciseSelection,
} from '../../utils/exerciseFilters';
import { toggled } from '../../utils/libraryListing';
import { CountedMultiSelect } from '../CountedMultiSelect';
import { CountedSelect } from '../CountedSelect';

export function ExerciseFilters({
  exercises,
  selection,
  onSelectionChange,
}: {
  exercises: readonly Exercise[];
  selection: ExerciseSelection;
  onSelectionChange: (selection: ExerciseSelection) => void;
}) {
  return (
    <>
      <CountedMultiSelect
        label="Tags"
        selected={selection.tags}
        options={EXERCISE_TAGS}
        labels={EXERCISE_TAG_LABELS}
        counts={countsByTag(exercises, selection)}
        onToggle={(tag) => onSelectionChange({ ...selection, tags: toggled(selection.tags, tag) })}
      />
      <CountedSelect
        label="Equipment"
        value={selection.equipment}
        options={EQUIPMENT_FILTERS}
        labels={EQUIPMENT_LABELS}
        counts={countsByEquipment(exercises, selection)}
        onChoose={(equipment) => onSelectionChange({ ...selection, equipment })}
      />
    </>
  );
}
