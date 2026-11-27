import type { RecordExerciseUsageUseCase } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type {
  ExerciseUsageFacade,
  VersionExerciseUsage,
  VersionExerciseUsageRecording,
} from "~/bounded-contexts/programs/exercise-library/public/exercise-usage-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type ExerciseUsageFacadeAdapterOptions = {
  recordExerciseUsageUseCase: RecordExerciseUsageUseCase;
  unitOfWork: UnitOfWork;
};

export class ExerciseUsageFacadeAdapter implements ExerciseUsageFacade {
  constructor(private readonly options: ExerciseUsageFacadeAdapterOptions) {}

  async recordVersionUsage({
    coachAccountId,
    ...usage
  }: VersionExerciseUsage): Promise<VersionExerciseUsageRecording> {
    const result = await this.options.unitOfWork(() =>
      this.options.recordExerciseUsageUseCase.execute({
        ownerAccountId: coachAccountId,
        ...usage,
      }),
    );

    return { status: result.status };
  }
}
