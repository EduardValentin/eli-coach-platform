import type { Clock } from "../shared";
import type { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import { ExerciseNames } from "./exercise-names";

const RESTORE_ATTEMPTS = 5;

export type RestoreExerciseResult =
  | { status: "restored"; exercise: Exercise }
  | { status: "not-found" }
  | { status: "failed" };

type RestoreExerciseUseCaseOptions = {
  library: Pick<ExerciseLibrary, "list" | "replace">;
  clock: Clock;
  incidents: Pick<ExerciseLibraryIncidents, "exerciseRestoreFailed">;
};

type RestoreAttempt = {
  exercise: Exercise;
  names: ExerciseNames;
  attemptsLeft: number;
};

export class RestoreExerciseUseCase {
  constructor(private readonly options: RestoreExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<RestoreExerciseResult> {
    try {
      return await this.restore(reference);
    } catch (error) {
      this.options.incidents.exerciseRestoreFailed({
        exerciseId: reference.exerciseId,
        error,
      });

      return { status: "failed" };
    }
  }

  private async restore({
    ownerAccountId,
    exerciseId,
  }: ExerciseReference): Promise<RestoreExerciseResult> {
    const exercises = await this.options.library.list(ownerAccountId);
    const exercise = exercises.find(({ id }) => id === exerciseId);

    if (!exercise) return { status: "not-found" };

    return this.attempt({
      exercise,
      names: ExerciseNames.reservedBy(exercises, exerciseId),
      attemptsLeft: RESTORE_ATTEMPTS,
    });
  }

  private async attempt({
    exercise,
    names,
    attemptsLeft,
  }: RestoreAttempt): Promise<RestoreExerciseResult> {
    if (attemptsLeft === 0) {
      throw new Error(
        `No free name found for the restored exercise after ${RESTORE_ATTEMPTS} attempts.`,
      );
    }

    const restored = exercise.restored({
      name: names.freeVariantOf(exercise.name),
      at: this.options.clock.now(),
    });

    if ((await this.options.library.replace(restored)) === "replaced") {
      return { status: "restored", exercise: restored };
    }

    return this.attempt({
      exercise,
      names: names.with(restored.name),
      attemptsLeft: attemptsLeft - 1,
    });
  }
}
