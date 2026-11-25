import type { ExerciseSnapshot } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import type { ExerciseStatus } from "./exercise-listing";
import { ExerciseNames } from "./exercise-names";

export type ExerciseListingEntry = ExerciseSnapshot & {
  status: ExerciseStatus;
  programCount: number;
};

export type ListExercisesResult = {
  status: "listed";
  exercises: ExerciseListingEntry[];
  reservedNames: string[];
};

type ListExercisesUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "list" | "programCountsOf">;
};

export class ListExercisesUseCase {
  constructor(private readonly options: ListExercisesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<ListExercisesResult> {
    const { exerciseLibraryPort } = this.options;
    const exercises = await exerciseLibraryPort.list(ownerAccountId);
    const programCounts =
      await exerciseLibraryPort.programCountsOf(ownerAccountId);

    return {
      status: "listed",
      exercises: exercises.map((exercise) => ({
        ...exercise.toSnapshot(),
        status: exercise.status,
        programCount: programCounts.get(exercise.id) ?? 0,
      })),
      reservedNames: ExerciseNames.reservedBy(exercises).toArray(),
    };
  }
}
