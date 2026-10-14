import {
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "@eli-coach-platform/ui/portal";
import {
  CheckboxChip,
  ChoiceGroup,
  ChoiceOption,
  InlineProblem,
  Input,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import { Dumbbell, Film, Target } from "lucide-react";
import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_TAG_LABELS,
  EXERCISE_TAGS,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPES,
  MUSCLE_LABELS,
  MUSCLES,
  toggled,
  UNIT_EXAMPLES,
  UNIT_LABELS,
  unitsFor,
  withPrimaryMuscleToggled,
  withTypeChosen,
  type ExerciseFieldProblems,
  type ExerciseFormValues,
} from "./exercise-form";

type ExerciseSectionProps = {
  form: UseFormReturn<ExerciseFormValues>;
  values: ExerciseFormValues;
  problems: ExerciseFieldProblems;
};

const BOTH_SIDES = "both";
const ONE_SIDE = "one";

const SECTION_ICON_CLASS = "text-brand-secondary";

function changeValues(
  form: UseFormReturn<ExerciseFormValues>,
  changes: Partial<ExerciseFormValues>,
) {
  for (const [field, value] of Object.entries(changes)) {
    form.setValue(field as keyof ExerciseFormValues, value, {
      shouldDirty: true,
    });
  }
}

function describedBy(problemId: string, problem: string | undefined) {
  return {
    "aria-describedby": problem ? problemId : undefined,
    "aria-invalid": problem ? true : undefined,
  };
}

function shownProblem(id: string, problem: string | undefined) {
  return problem && <InlineProblem id={id}>{problem}</InlineProblem>;
}

export function ExerciseAboutSection({
  form,
  values,
  problems,
}: ExerciseSectionProps) {
  const nameId = useId();
  const nameProblemId = useId();
  const typeId = useId();
  const unitId = useId();
  const sidesLabelId = useId();

  return (
    <SettingsSection
      headingId="exercise-about-heading"
      icon={
        <Dumbbell aria-hidden="true" className={SECTION_ICON_CLASS} size={18} />
      }
      title="About the exercise"
    >
      <SettingsRows>
        <SettingsRow
          htmlFor={nameId}
          layout="stacked"
          problem={shownProblem(nameProblemId, problems.name)}
          title="Name"
        >
          <Input
            defaultValue={form.formState.defaultValues?.name}
            id={nameId}
            placeholder="e.g. Barbell back squat"
            {...describedBy(nameProblemId, problems.name)}
            {...form.register("name")}
          />
        </SettingsRow>
        <SettingsRow htmlFor={typeId} layout="stacked" title="Type">
          <Select
            onValueChange={(chosen) => {
              const type = EXERCISE_TYPES.find((known) => known === chosen);
              if (type) changeValues(form, withTypeChosen(values, type));
            }}
            value={values.type}
          >
            <SelectTrigger id={typeId}>
              <SelectValue>{EXERCISE_TYPE_LABELS[values.type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {EXERCISE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow htmlFor={unitId} layout="stacked" title="Measured in">
          <Select
            onValueChange={(chosen) => {
              const unit = unitsFor(values.type).find(
                (allowed) => allowed === chosen,
              );
              if (unit) changeValues(form, { unit, unitPicked: true });
            }}
            value={values.unit}
          >
            <SelectTrigger id={unitId}>
              <SelectValue>{UNIT_LABELS[values.unit]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {unitsFor(values.type).map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {UNIT_LABELS[unit]}{" "}
                  <span
                    className="text-xs text-text-secondary in-data-[state=checked]:text-current"
                    data-parity="unit-example"
                  >
                    {UNIT_EXAMPLES[unit]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow labelId={sidesLabelId} layout="stacked" title="Sides">
          <ChoiceGroup
            aria-labelledby={sidesLabelId}
            onValueChange={(sides) =>
              changeValues(form, { perSide: sides === ONE_SIDE })
            }
            size="md"
            value={values.perSide ? ONE_SIDE : BOTH_SIDES}
          >
            <ChoiceOption value={BOTH_SIDES}>Both sides together</ChoiceOption>
            <ChoiceOption value={ONE_SIDE}>One side at a time</ChoiceOption>
          </ChoiceGroup>
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}

export function ExerciseWorkSection({
  form,
  values,
  problems,
}: ExerciseSectionProps) {
  const primaryId = useId();
  const primaryProblemId = useId();
  const secondaryId = useId();
  const equipmentId = useId();
  const difficultyId = useId();
  const tagsLabelId = useId();

  return (
    <SettingsSection
      headingId="exercise-work-heading"
      icon={
        <Target aria-hidden="true" className={SECTION_ICON_CLASS} size={18} />
      }
      title="What it works"
    >
      <SettingsRows>
        <SettingsRow
          htmlFor={primaryId}
          layout="stacked"
          problem={shownProblem(primaryProblemId, problems.primaryMuscles)}
          title="Primary muscles"
        >
          <MultiSelect
            id={primaryId}
            label="Primary muscles"
            labels={MUSCLE_LABELS}
            onToggle={(muscle) =>
              changeValues(form, withPrimaryMuscleToggled(values, muscle))
            }
            options={MUSCLES}
            placeholder="Pick muscles"
            selected={values.primaryMuscles}
            size="md"
            summary="names"
            {...describedBy(primaryProblemId, problems.primaryMuscles)}
          />
        </SettingsRow>
        <SettingsRow
          htmlFor={secondaryId}
          layout="stacked"
          title="Secondary muscles"
        >
          <MultiSelect
            id={secondaryId}
            label="Secondary muscles"
            labels={MUSCLE_LABELS}
            onToggle={(muscle) =>
              changeValues(form, {
                secondaryMuscles: toggled(values.secondaryMuscles, muscle),
              })
            }
            options={MUSCLES.filter(
              (muscle) => !values.primaryMuscles.includes(muscle),
            )}
            placeholder="Pick muscles"
            selected={values.secondaryMuscles}
            size="md"
            summary="names"
          />
        </SettingsRow>
        <SettingsRow
          description="Leave it empty for a bodyweight exercise."
          htmlFor={equipmentId}
          layout="stacked"
          title="Equipment"
        >
          <MultiSelect
            id={equipmentId}
            label="Equipment"
            labels={EQUIPMENT_LABELS}
            onToggle={(item) =>
              changeValues(form, { equipment: toggled(values.equipment, item) })
            }
            options={EQUIPMENT}
            placeholder="Pick equipment"
            selected={values.equipment}
            size="md"
            summary="names"
          />
        </SettingsRow>
        <SettingsRow htmlFor={difficultyId} layout="stacked" title="Difficulty">
          <Select
            onValueChange={(chosen) => {
              const difficulty = DIFFICULTIES.find((known) => known === chosen);
              if (difficulty) changeValues(form, { difficulty });
            }}
            value={values.difficulty}
          >
            <SelectTrigger id={difficultyId}>
              <SelectValue>{DIFFICULTY_LABELS[values.difficulty]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((difficulty) => (
                <SelectItem key={difficulty} value={difficulty}>
                  {DIFFICULTY_LABELS[difficulty]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          as="fieldset"
          labelId={tagsLabelId}
          layout="stacked"
          title="Tags"
        >
          <ul className="flex flex-wrap gap-2" data-parity="exercise-tag-chips">
            {EXERCISE_TAGS.map((tag) => (
              <li key={tag}>
                <CheckboxChip
                  aria-label={EXERCISE_TAG_LABELS[tag]}
                  isChecked={values.tags.includes(tag)}
                  onChange={() =>
                    changeValues(form, { tags: toggled(values.tags, tag) })
                  }
                  size="compact"
                >
                  {EXERCISE_TAG_LABELS[tag]}
                </CheckboxChip>
              </li>
            ))}
          </ul>
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}

export function ExerciseCoachingSection({
  form,
  problems,
}: Omit<ExerciseSectionProps, "values">) {
  const cuesId = useId();
  const cuesProblemId = useId();

  return (
    <SettingsSection
      headingId="exercise-coaching-heading"
      icon={
        <Film aria-hidden="true" className={SECTION_ICON_CLASS} size={18} />
      }
      title="Coaching"
    >
      <SettingsRows>
        <SettingsRow
          htmlFor={cuesId}
          layout="stacked"
          problem={shownProblem(cuesProblemId, problems.cues)}
          title="Form cues"
        >
          <Textarea
            defaultValue={form.formState.defaultValues?.cues}
            id={cuesId}
            placeholder="Keep the chest up, drive through the heels…"
            rows={3}
            {...describedBy(cuesProblemId, problems.cues)}
            {...form.register("cues")}
          />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
