import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_ROLES,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_FORM_CUES_LENGTH,
  MOVEMENT_PATTERNS,
  MUSCLES,
  takesPatternAndRole,
  unitsFor,
  type Difficulty,
  type Equipment,
  type ExerciseRole,
  type ExerciseTag,
  type ExerciseType,
  type ExerciseUnit,
  type MovementPattern,
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
  pattern: string | null;
  role: string | null;
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
  pattern: MovementPattern | null;
  role: ExerciseRole | null;
  tags: ExerciseTag[];
  cues: string;
};

export type ExerciseDraftProblems = {
  name?: "missing" | "too-long";
  type?: "unknown";
  unit?: "unknown" | "not-allowed";
  primaryMuscles?: "missing" | "unknown";
  secondaryMuscles?: "unknown" | "overlap";
  equipment?: "unknown";
  difficulty?: "unknown";
  pattern?: "missing" | "unknown";
  role?: "missing" | "unknown";
  tags?: "unknown";
  cues?: "too-long";
};

const DRAFT_LISTS = [
  "primaryMuscles",
  "secondaryMuscles",
  "equipment",
  "tags",
] as const;

const RESISTANCE_ONLY_CHOICES = ["pattern", "role"] as const;

export type ExerciseDraftResult =
  | { status: "valid"; draft: ExerciseDraft }
  | { status: "invalid"; problems: ExerciseDraftProblems };

export class ExerciseDraft {
  private constructor(private readonly snapshot: ExerciseDraftSnapshot) {}

  static from(input: ExerciseDraftInput): ExerciseDraftResult {
    const chosen = <Value extends string>(
      vocabulary: readonly Value[],
      entered: readonly string[],
    ): Value[] =>
      entered.flatMap((value) => vocabulary.filter((known) => known === value));
    const type = EXERCISE_TYPES.find((known) => known === input.type);
    const unit = EXERCISE_UNITS.find((known) => known === input.unit);
    const difficulty = DIFFICULTIES.find((known) => known === input.difficulty);
    const pattern = MOVEMENT_PATTERNS.find((known) => known === input.pattern);
    const role = EXERCISE_ROLES.find((known) => known === input.role);
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
      ...(input.pattern !== null &&
        pattern === undefined && { pattern: "unknown" }),
      ...(input.role !== null && role === undefined && { role: "unknown" }),
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
      pattern: takesPatternAndRole(type) ? (pattern ?? null) : null,
      role: takesPatternAndRole(type) ? (role ?? null) : null,
      tags: [...new Set(tags)],
      cues: input.cues,
    });
    const problems = draft.problems();

    if (Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return { status: "valid", draft };
  }

  fieldsNormalizedFrom(input: ExerciseDraftInput): string[] {
    return [
      ...(input.name === this.snapshot.name ? [] : ["name"]),
      ...DRAFT_LISTS.filter(
        (list) => input[list].length !== this.snapshot[list].length,
      ),
      ...RESISTANCE_ONLY_CHOICES.filter(
        (choice) => input[choice] !== this.snapshot[choice],
      ),
    ];
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

  private problems(): ExerciseDraftProblems {
    const name = this.nameProblem();
    const {
      type,
      unit,
      primaryMuscles,
      secondaryMuscles,
      pattern,
      role,
      cues,
    } = this.snapshot;
    const needsPatternAndRole = takesPatternAndRole(type);

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
      ...(needsPatternAndRole && pattern === null && { pattern: "missing" }),
      ...(needsPatternAndRole && role === null && { role: "missing" }),
      ...(cues.length > MAX_FORM_CUES_LENGTH && { cues: "too-long" }),
    };
  }

  private nameProblem(): ExerciseDraftProblems["name"] {
    if (this.snapshot.name.length === 0) return "missing";
    if (this.snapshot.name.length > MAX_EXERCISE_NAME_LENGTH) return "too-long";

    return undefined;
  }
}
