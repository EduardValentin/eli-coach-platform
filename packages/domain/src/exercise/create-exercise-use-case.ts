import type { Clock } from "../shared";
import { Exercise, type ExerciseProblems } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseIds } from "./exercise-ids";
import type { ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import {
  ExerciseVideoIntake,
  type ExerciseVideoChoice,
} from "./exercise-video-intake";
import type { ExerciseVideoStore } from "./exercise-video-store";

type CreateExerciseCommand = {
  draft: ExerciseDraftInput;
  video: ExerciseVideoChoice;
};

export type CreateExerciseResult =
  | { status: "created"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseProblems }
  | { status: "failed" };

type CreateExerciseUseCaseOptions = {
  library: ExerciseLibrary;
  ids: ExerciseIds;
  clock: Clock;
  incidents: ExerciseLibraryIncidents;
  formats: ExerciseVideoFormatDetector;
  store: Pick<ExerciseVideoStore, "keep" | "discard" | "remove">;
};

export class CreateExerciseUseCase {
  private readonly videos: ExerciseVideoIntake;

  constructor(private readonly options: CreateExerciseUseCaseOptions) {
    this.videos = new ExerciseVideoIntake(options);
  }

  async execute(command: CreateExerciseCommand): Promise<CreateExerciseResult> {
    try {
      return await this.create(command);
    } catch (error) {
      this.options.incidents.exerciseCreationFailed({ error });
      await this.videos.discard(command.video);

      return { status: "failed" };
    }
  }

  private async create({
    draft: input,
    video: choice,
  }: CreateExerciseCommand): Promise<CreateExerciseResult> {
    const { library, ids, clock } = this.options;
    const otherNames = (await library.list()).map(({ name }) => name);
    const draft = ExerciseDraft.from(input, otherNames);
    const video = await this.videos.judged(choice);

    if (draft.status === "invalid" || video.kind === "refused") {
      await this.videos.discard(choice);

      return {
        status: "invalid",
        problems: {
          ...(draft.status === "invalid" && draft.problems),
          ...(video.kind === "refused" && { video: video.refusal }),
        },
      };
    }

    const change = await this.videos.changeFor(video);
    const exercise = Exercise.added({
      id: ids.generate(),
      draft: draft.draft,
      at: clock.now(),
      video: change,
    });

    if (
      (await this.videos.writtenWith(change, () => library.add(exercise))) ===
      "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", exercise };
  }
}
