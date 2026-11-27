import type {
  ExerciseUsagePort,
  VersionExerciseUsage,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type { ExerciseUsageFacade } from "~/bounded-contexts/programs/exercise-library/public/exercise-usage-facade";

export class ExerciseLibraryExerciseUsageAdapter implements ExerciseUsagePort {
  constructor(private readonly exerciseUsageFacade: ExerciseUsageFacade) {}

  async recordVersionUsage(usage: VersionExerciseUsage): Promise<void> {
    const { status } = await this.exerciseUsageFacade.recordVersionUsage({
      ...usage,
      exerciseIds: [...usage.exerciseIds],
    });

    // The program checked every exercise against her library before writing,
    // so only a concurrent delete lands here; failing rolls the write back.
    if (status !== "recorded") {
      throw new Error(
        `The library refused program ${usage.programId} version ${usage.versionNumber}'s exercises: ${status}.`,
      );
    }
  }
}
