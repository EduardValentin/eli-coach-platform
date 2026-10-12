import type { Exercise } from '../../context/TrainingContext';
import {
  EQUIPMENT_FILTERS,
  EQUIPMENT_LABELS,
  EXERCISE_TAGS,
  EXERCISE_TAG_LABELS,
  TYPE_FILTERS,
  TYPE_FILTER_LABELS,
  countsByEquipment,
  countsByTag,
  countsByType,
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
      <CountedSelect
        label="Type"
        value={selection.type}
        options={TYPE_FILTERS}
        labels={TYPE_FILTER_LABELS}
        counts={countsByType(exercises, selection)}
        onChoose={(type) => onSelectionChange({ ...selection, type })}
      />
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
