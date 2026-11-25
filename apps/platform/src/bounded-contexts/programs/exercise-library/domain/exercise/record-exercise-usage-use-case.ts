import type {
  ExerciseLibraryPort,
  ExerciseVersionUsage,
} from "./exercise-library-port";

export type RecordExerciseUsageInput = ExerciseVersionUsage & {
  ownerAccountId: string;
};

export type RecordExerciseUsageResult =
  { status: "recorded" } | { status: "unknown-exercise" };

type RecordExerciseUsageUseCaseOptions = {
  exerciseLibraryPort: Pick<
    ExerciseLibraryPort,
    "list" | "replaceVersionUsage"
  >;
};

export class RecordExerciseUsageUseCase {
  constructor(private readonly options: RecordExerciseUsageUseCaseOptions) {}

  async execute({
    ownerAccountId,
    ...usage
  }: RecordExerciseUsageInput): Promise<RecordExerciseUsageResult> {
    const { exerciseLibraryPort } = this.options;
    const exercises = await exerciseLibraryPort.list(ownerAccountId);
    const hers = new Set(exercises.map(({ id }) => id));
    const exerciseIds = [...new Set(usage.exerciseIds)];

    if (!exerciseIds.every((exerciseId) => hers.has(exerciseId))) {
      return { status: "unknown-exercise" };
    }

    await exerciseLibraryPort.replaceVersionUsage({ ...usage, exerciseIds });

    return { status: "recorded" };
  }
}
