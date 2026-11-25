import type { Equipment, LibraryExercise } from "./library-exercise";
import { MAX_SUBSTITUTIONS } from "./program-content";

const LIGHT_EQUIPMENT: readonly Equipment[] = ["Bands", "Dumbbells"];

/** Substitutions suggested from the library by movement pattern, primary muscle and her equipment (Business Rule 35). */
export class Substitutions {
  static suggestedFor(
    exercise: LibraryExercise,
    libraryExercises: readonly LibraryExercise[],
    equipment: readonly Equipment[],
  ): string[] {
    const candidates = libraryExercises.filter(
      (other) =>
        other.id !== exercise.id &&
        !other.archived &&
        other.pattern !== null &&
        other.pattern === exercise.pattern &&
        other.primaryMuscles.some((muscle) =>
          exercise.primaryMuscles.includes(muscle),
        ),
    );
    const owned = candidates.filter((candidate) =>
      candidate.equipment.every((item) => equipment.includes(item)),
    );
    const others = candidates.filter((candidate) => !owned.includes(candidate));
    const picks = Substitutions.pickPair(owned);
    const remaining = MAX_SUBSTITUTIONS - picks.length;

    return [
      ...picks,
      ...Substitutions.pickPair(others).slice(0, remaining),
    ].map((pick) => pick.id);
  }

  private static isLight(exercise: LibraryExercise): boolean {
    return exercise.equipment.every((item) => LIGHT_EQUIPMENT.includes(item));
  }

  private static pickPair(
    candidates: readonly LibraryExercise[],
  ): LibraryExercise[] {
    const light = candidates.find(Substitutions.isLight);
    const heavy = candidates.find(
      (candidate) => !Substitutions.isLight(candidate),
    );
    const picked = [light, heavy].filter(
      (candidate): candidate is LibraryExercise => candidate !== undefined,
    );
    const rest = candidates.filter((candidate) => !picked.includes(candidate));

    return [...picked, ...rest].slice(0, MAX_SUBSTITUTIONS);
  }
}
