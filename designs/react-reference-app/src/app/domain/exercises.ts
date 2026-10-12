export const EXERCISE_TYPES = ['resistance', 'cardio', 'mobility'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  resistance: 'Resistance',
  cardio: 'Cardio',
  mobility: 'Mobility',
};

export const MEASURES = ['reps', 'time', 'distance'] as const;
export type Measure = (typeof MEASURES)[number];
export const MEASURE_LABELS: Record<Measure, string> = {
  reps: 'Reps',
  time: 'Time',
  distance: 'Distance',
};

const DEFAULT_MEASURE: Record<ExerciseType, Measure> = {
  resistance: 'reps',
  cardio: 'time',
  mobility: 'time',
};

export function defaultMeasureFor(type: ExerciseType): Measure {
  return DEFAULT_MEASURE[type];
}

export const MUSCLES = [
  'Chest', 'Upper back', 'Lats', 'Lower back', 'Traps', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Core', 'Obliques', 'Glutes', 'Quadriceps', 'Hamstrings', 'Adductors',
  'Abductors', 'Hip flexors', 'Calves', 'Full body',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'Barbell', 'Dumbbells', 'Kettlebell', 'EZ bar', 'Trap bar', 'Cable', 'Machine',
  'Smith machine', 'Bands', 'Suspension trainer', 'Pull-up bar', 'Squat rack', 'Bench',
  'Box or step', 'Medicine ball', 'Stability ball', 'Mat', 'Foam roller', 'Treadmill',
  'Bike', 'Rower', 'Stair climber', 'Jump rope',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXERCISE_TAGS = ['Strength', 'Hypertrophy', 'Recovery'] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];
export const EXERCISE_TAG_LABELS: Record<ExerciseTag, string> = {
  Strength: 'Strength',
  Hypertrophy: 'Hypertrophy',
  Recovery: 'Recovery',
};

export function labelsOf<Value extends string>(values: readonly Value[]): Record<Value, string> {
  return Object.fromEntries(values.map((value) => [value, value])) as Record<string, string>;
}

export function needsEquipment(equipment: readonly string[]): boolean {
  return equipment.length > 0;
}

export type ExerciseDraft = {
  name: string;
  type: ExerciseType;
  measuredIn: Measure;
  perSide: boolean;
  primaryMuscles: readonly Muscle[];
  secondaryMuscles: readonly Muscle[];
  equipment: readonly Equipment[];
  difficulty: Difficulty;
  tags: readonly ExerciseTag[];
  cues: string;
};

export function withPrimaryMuscleToggled(draft: ExerciseDraft, muscle: Muscle): ExerciseDraft {
  const primaryMuscles = draft.primaryMuscles.includes(muscle)
    ? draft.primaryMuscles.filter((other) => other !== muscle)
    : [...draft.primaryMuscles, muscle];
  return {
    ...draft,
    primaryMuscles,
    secondaryMuscles: draft.secondaryMuscles.filter((other) => other !== muscle),
  };
}

export type ExerciseDraftProblems ={ name?: string; primaryMuscles?: string };

const normalisedName = (name: string) => name.trim().toLowerCase();

function nameProblem(name: string, others: readonly { name: string }[]): string | undefined {
  if (name.trim() === '') return 'Give the exercise a name';
  const taken = others.some((other) => normalisedName(other.name) === normalisedName(name));
  return taken ? 'An exercise with this name already exists' : undefined;
}

function primaryMusclesProblem(draft: ExerciseDraft): string | undefined {
  if (draft.type === 'cardio' || draft.primaryMuscles.length > 0) return undefined;
  return 'Pick at least one primary muscle';
}

export function draftProblems(
  draft: ExerciseDraft,
  others: readonly { name: string }[],
): ExerciseDraftProblems {
  const problems: ExerciseDraftProblems = {};
  const name = nameProblem(draft.name, others);
  if (name) problems.name = name;
  const primaryMuscles = primaryMusclesProblem(draft);
  if (primaryMuscles) problems.primaryMuscles = primaryMuscles;
  return problems;
}

export function isValidDraft(problems: ExerciseDraftProblems): boolean {
  return Object.keys(problems).length === 0;
}
