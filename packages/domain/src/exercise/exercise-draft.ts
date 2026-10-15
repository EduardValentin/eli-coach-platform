import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_FORM_CUES_LENGTH,
  MUSCLES,
  unitsFor,
  type Difficulty,
  type Equipment,
  type ExerciseTag,
  type ExerciseType,
  type ExerciseUnit,
  type Muscle,
} from "./vocabulary";

export type ExerciseDraftInput = {
  name: string;
  type: string;
  unit: string;
  perSide: boolean;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  equipment: readonly string[];
  difficulty: string;
  tags: readonly string[];
  cues: string;
};

export type ExerciseDraftSnapshot = {
  name: string;
  type: ExerciseType;
  unit: ExerciseUnit;
  perSide: boolean;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment[];
  difficulty: Difficulty;
  tags: ExerciseTag[];
  cues: string;
};

export type ExerciseDraftProblems = {
  name?: "missing" | "too-long" | "taken";
  type?: "unknown";
  unit?: "unknown" | "not-allowed";
  primaryMuscles?: "missing" | "unknown";
  secondaryMuscles?: "unknown" | "overlap";
  equipment?: "unknown";
  difficulty?: "unknown";
  tags?: "unknown";
  cues?: "too-long";
};

export type ExerciseDraftResult =
  | { status: "valid"; draft: ExerciseDraft }
  | { status: "invalid"; problems: ExerciseDraftProblems };

export class ExerciseDraft {
  private constructor(private readonly snapshot: ExerciseDraftSnapshot) {}

  static from(
    input: ExerciseDraftInput,
    otherNames: readonly string[] = [],
  ): ExerciseDraftResult {
    const chosen = <Value extends string>(
      vocabulary: readonly Value[],
      entered: readonly string[],
    ): Value[] =>
      entered.flatMap((value) => vocabulary.filter((known) => known === value));
    const type = EXERCISE_TYPES.find((known) => known === input.type);
    const unit = EXERCISE_UNITS.find((known) => known === input.unit);
    const difficulty = DIFFICULTIES.find((known) => known === input.difficulty);
    const primaryMuscles = chosen(MUSCLES, input.primaryMuscles);
    const secondaryMuscles = chosen(MUSCLES, input.secondaryMuscles);
    const equipment = chosen(EQUIPMENT, input.equipment);
    const tags = chosen(EXERCISE_TAGS, input.tags);
    const unknown: ExerciseDraftProblems = {
      ...(type === undefined && { type: "unknown" }),
      ...(unit === undefined && { unit: "unknown" }),
      ...(primaryMuscles.length < input.primaryMuscles.length && {
        primaryMuscles: "unknown",
      }),
      ...(secondaryMuscles.length < input.secondaryMuscles.length && {
        secondaryMuscles: "unknown",
      }),
      ...(equipment.length < input.equipment.length && {
        equipment: "unknown",
      }),
      ...(difficulty === undefined && { difficulty: "unknown" }),
      ...(tags.length < input.tags.length && { tags: "unknown" }),
    };

    if (
      type === undefined ||
      unit === undefined ||
      difficulty === undefined ||
      Object.keys(unknown).length > 0
    ) {
      return { status: "invalid", problems: unknown };
    }

    const draft = new ExerciseDraft({
      name: input.name.trim(),
      type,
      unit,
      perSide: input.perSide,
      primaryMuscles: [...new Set(primaryMuscles)],
      secondaryMuscles: [...new Set(secondaryMuscles)],
      equipment: [...new Set(equipment)],
      difficulty,
      tags: [...new Set(tags)],
      cues: input.cues,
    });
    const problems = draft.problemsAmong(otherNames);

    if (Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return { status: "valid", draft };
  }

  toSnapshot(): ExerciseDraftSnapshot {
    return {
      ...this.snapshot,
      primaryMuscles: [...this.snapshot.primaryMuscles],
      secondaryMuscles: [...this.snapshot.secondaryMuscles],
      equipment: [...this.snapshot.equipment],
      tags: [...this.snapshot.tags],
    };
  }

  private problemsAmong(otherNames: readonly string[]): ExerciseDraftProblems {
    const name = this.nameProblemAmong(otherNames);
    const { type, unit, primaryMuscles, secondaryMuscles, cues } =
      this.snapshot;

    return {
      ...(name && { name }),
      ...(!unitsFor(type).includes(unit) && { unit: "not-allowed" }),
      ...(type !== "cardio" &&
        primaryMuscles.length === 0 && { primaryMuscles: "missing" }),
      ...(secondaryMuscles.some((muscle) =>
        primaryMuscles.includes(muscle),
      ) && {
        secondaryMuscles: "overlap",
      }),
      ...(cues.length > MAX_FORM_CUES_LENGTH && { cues: "too-long" }),
    };
  }

  private nameProblemAmong(
    otherNames: readonly string[],
  ): ExerciseDraftProblems["name"] {
    if (this.snapshot.name.length === 0) return "missing";
    if (this.snapshot.name.length > MAX_EXERCISE_NAME_LENGTH) return "too-long";
    if (this.isNameAmong(otherNames)) return "taken";

    return undefined;
  }

  private isNameAmong(otherNames: readonly string[]): boolean {
    const comparable = this.snapshot.name.toLowerCase();

    return otherNames.some(
      (otherName) => otherName.trim().toLowerCase() === comparable,
    );
  }
}
