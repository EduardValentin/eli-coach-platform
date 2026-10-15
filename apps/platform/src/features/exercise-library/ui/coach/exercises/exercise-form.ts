import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  ExerciseDraft,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_FORM_CUES_LENGTH,
  MUSCLES,
  defaultUnitFor,
  unitsFor,
  type Difficulty,
  type Equipment,
  type ExerciseDraftProblems,
  type ExerciseTag,
  type ExerciseType,
  type ExerciseUnit,
  type Muscle,
} from "@eli-coach-platform/domain/exercise";
import { toggled } from "@eli-coach-platform/ui/lib";
import type { FieldErrors, Resolver } from "react-hook-form";

import type {
  ExerciseRequest,
  ExerciseView,
} from "~/features/exercise-library/public/exercises";

export {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  MUSCLES,
  unitsFor,
  type ExerciseType,
  type ExerciseUnit,
};

export type ExerciseFormValues = {
  name: string;
  type: ExerciseType;
  unit: ExerciseUnit;
  unitPicked: boolean;
  perSide: boolean;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  difficulty: Difficulty;
  tags: ExerciseTag[];
  cues: string;
};

export const EXERCISE_PROBLEM_FIELDS = [
  "name",
  "primaryMuscles",
  "cues",
] as const;

export type ExerciseProblemField = (typeof EXERCISE_PROBLEM_FIELDS)[number];

export type ExerciseFieldProblems = Partial<
  Record<ExerciseProblemField, string>
>;

export const EXERCISE_TYPE_LABELS: Readonly<Record<ExerciseType, string>> = {
  resistance: "Resistance",
  cardio: "Cardio",
  mobility: "Mobility",
  stretching: "Stretching",
  breathing: "Breathing",
};

export const UNIT_LABELS: Readonly<Record<ExerciseUnit, string>> = {
  reps: "Reps",
  time: "Time",
  distance: "Distance",
  breaths: "Breaths",
};

export const UNIT_EXAMPLES: Readonly<Record<ExerciseUnit, string>> = {
  reps: "e.g. 3 × 10",
  time: "e.g. 45 s hold",
  distance: "e.g. 400 m",
  breaths: "e.g. 10 breaths",
};

function labelsOf<Value extends string>(
  values: readonly Value[],
): Readonly<Record<Value, string>> {
  return Object.fromEntries(
    values.map((value): [Value, string] => [value, value]),
  ) as Record<Value, string>;
}

export const MUSCLE_LABELS = labelsOf(MUSCLES);
export const EQUIPMENT_LABELS = labelsOf(EQUIPMENT);
export const DIFFICULTY_LABELS = labelsOf(DIFFICULTIES);
export const EXERCISE_TAG_LABELS = labelsOf(EXERCISE_TAGS);

const PROBLEM_COPY = {
  name: {
    missing: "Give the exercise a name",
    "too-long": `Keep the name to ${MAX_EXERCISE_NAME_LENGTH} characters`,
    taken: "An exercise with this name already exists",
  },
  primaryMuscles: { missing: "Pick at least one primary muscle" },
  cues: {
    "too-long": `Keep the form cues to ${MAX_FORM_CUES_LENGTH.toLocaleString("en-GB")} characters`,
  },
} as const;

export function newExerciseFormValues(): ExerciseFormValues {
  return {
    name: "",
    type: "resistance",
    unit: defaultUnitFor("resistance"),
    unitPicked: false,
    perSide: false,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    difficulty: "Beginner",
    tags: [],
    cues: "",
  };
}

export function exerciseFormValuesOf(
  exercise: ExerciseView,
): ExerciseFormValues {
  return {
    name: exercise.name,
    type: exercise.type,
    unit: exercise.unit,
    unitPicked: exercise.unit !== defaultUnitFor(exercise.type),
    perSide: exercise.perSide,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: [...exercise.equipment],
    difficulty: exercise.difficulty,
    tags: [...exercise.tags],
    cues: exercise.cues,
  };
}

export function withTypeChosen(
  values: Pick<ExerciseFormValues, "unit" | "unitPicked">,
  type: ExerciseType,
): Pick<ExerciseFormValues, "type" | "unit" | "unitPicked"> {
  if (values.unitPicked && unitsFor(type).includes(values.unit)) {
    return { type, unit: values.unit, unitPicked: true };
  }

  return { type, unit: defaultUnitFor(type), unitPicked: false };
}

export function withPrimaryMuscleToggled(
  values: Pick<ExerciseFormValues, "primaryMuscles" | "secondaryMuscles">,
  muscle: Muscle,
): Pick<ExerciseFormValues, "primaryMuscles" | "secondaryMuscles"> {
  return {
    primaryMuscles: toggled(values.primaryMuscles, muscle),
    secondaryMuscles: values.secondaryMuscles.filter(
      (other) => other !== muscle,
    ),
  };
}

export function exerciseRequestOf(values: ExerciseFormValues): ExerciseRequest {
  const { unitPicked: _unitPicked, ...request } = values;

  return request;
}

export function exerciseFieldProblemsOf(
  problems: ExerciseDraftProblems,
): ExerciseFieldProblems {
  const primaryMuscles =
    problems.primaryMuscles === "missing"
      ? PROBLEM_COPY.primaryMuscles.missing
      : undefined;

  return {
    ...(problems.name && { name: PROBLEM_COPY.name[problems.name] }),
    ...(primaryMuscles && { primaryMuscles }),
    ...(problems.cues && { cues: PROBLEM_COPY.cues[problems.cues] }),
  };
}

export function shownExerciseProblemsOf(
  errors: FieldErrors<ExerciseFormValues>,
): ExerciseFieldProblems {
  return {
    name: errors.name?.message,
    primaryMuscles: errors.primaryMuscles?.message,
    cues: errors.cues?.message,
  };
}

export function exerciseFormResolver(
  otherNames: () => readonly string[],
): Resolver<ExerciseFormValues> {
  return (values) => {
    const draft = ExerciseDraft.from(exerciseRequestOf(values), otherNames());

    if (draft.status === "valid") {
      return { values, errors: {} };
    }

    const errors: FieldErrors<ExerciseFormValues> = Object.fromEntries(
      Object.entries(exerciseFieldProblemsOf(draft.problems)).map(
        ([field, message]) => [field, { type: "problem", message }],
      ),
    );

    return { values: {}, errors };
  };
}
