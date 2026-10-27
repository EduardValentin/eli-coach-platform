import type { Exercise } from "./exercise";
import { MAX_EXERCISE_NAME_LENGTH } from "./vocabulary";

const FIRST_VARIANT_NUMBER = 2;

export class ExerciseNames {
  private constructor(private readonly names: readonly string[]) {}

  static of(names: readonly string[]): ExerciseNames {
    return new ExerciseNames([...names]);
  }

  static reservedBy(
    exercises: readonly Exercise[],
    exceptExerciseId?: string,
  ): ExerciseNames {
    return new ExerciseNames(
      exercises
        .filter(
          ({ id, status }) => id !== exceptExerciseId && status === "active",
        )
        .map(({ name }) => name),
    );
  }

  includes(name: string): boolean {
    const comparable = this.comparableOf(name);

    return this.names.some((held) => this.comparableOf(held) === comparable);
  }

  freeVariantOf(name: string): string {
    if (!this.includes(name)) return name;

    return this.firstFreeVariantFrom(name, FIRST_VARIANT_NUMBER);
  }

  with(name: string): ExerciseNames {
    return new ExerciseNames([...this.names, name]);
  }

  toArray(): string[] {
    return [...this.names];
  }

  private firstFreeVariantFrom(name: string, number: number): string {
    const variant = this.numbered(name, number);

    return this.includes(variant)
      ? this.firstFreeVariantFrom(name, number + 1)
      : variant;
  }

  private numbered(name: string, number: number): string {
    const suffix = ` (${number})`;
    const base = name
      .slice(0, MAX_EXERCISE_NAME_LENGTH - suffix.length)
      .trimEnd();

    return `${base}${suffix}`;
  }

  private comparableOf(name: string): string {
    return name.trim().toLowerCase();
  }
}
