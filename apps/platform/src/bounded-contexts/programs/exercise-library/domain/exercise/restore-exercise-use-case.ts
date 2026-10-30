import type { ClockPort } from "../clock-port";
import type { Exercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import { ExerciseNames } from "./exercise-names";

const RESTORE_ATTEMPTS = 5;

export type RestoreExerciseResult =
  | { status: "restored"; exercise: Exercise }
  | { status: "not-found" }
  | { status: "failed" };

type RestoreExerciseUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "list" | "replace">;
  clockPort: ClockPort;
  exerciseLibraryIncidentsPort: Pick<
    ExerciseLibraryIncidentsPort,
    "exerciseRestoreFailed"
  >;
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
      return this.failed(reference.exerciseId, error);
    }
  }

  private async restore({
    ownerAccountId,
    exerciseId,
  }: ExerciseReference): Promise<RestoreExerciseResult> {
    const exercises =
      await this.options.exerciseLibraryPort.list(ownerAccountId);
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
      return this.failed(
        exercise.id,
        new Error(
          `No free name found for the restored exercise after ${RESTORE_ATTEMPTS} attempts.`,
        ),
      );
    }

    const restored = exercise.restored({
      name: names.freeVariantOf(exercise.name),
      at: this.options.clockPort.now(),
    });

    if (
      (await this.options.exerciseLibraryPort.replace(restored)) === "replaced"
    ) {
      return { status: "restored", exercise: restored };
    }

    return this.attempt({
      exercise,
      names: names.with(restored.name),
      attemptsLeft: attemptsLeft - 1,
    });
  }

  private failed(exerciseId: string, error: unknown): RestoreExerciseResult {
    this.options.exerciseLibraryIncidentsPort.exerciseRestoreFailed({
      exerciseId,
      error,
    });

    return { status: "failed" };
  }
}
