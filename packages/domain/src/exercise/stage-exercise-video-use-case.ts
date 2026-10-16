import { MAX_EXERCISE_VIDEO_BYTES } from "./exercise-video";
import type {
  ExerciseVideoStore,
  StagedExerciseVideo,
} from "./exercise-video-store";

type StageExerciseVideoUseCaseOptions = {
  store: Pick<ExerciseVideoStore, "receive" | "discard">;
};

export class StageExerciseVideoUseCase {
  constructor(private readonly options: StageExerciseVideoUseCaseOptions) {}

  async execute(
    bytes: AsyncIterable<Uint8Array>,
  ): Promise<StagedExerciseVideo> {
    return this.options.store.receive(bytes, MAX_EXERCISE_VIDEO_BYTES + 1);
  }

  async discard(staged: StagedExerciseVideo): Promise<void> {
    await this.options.store.discard(staged.stagingId);
  }
}
