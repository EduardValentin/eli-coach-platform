import type { Clock } from "../shared";
import type { Exercise, ExerciseSaveProblems } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import type { ExerciseVideoChoice } from "./exercise-video-intake";
import { ExerciseVideoSaving } from "./exercise-video-saving";
import type { ExerciseVideoStore } from "./exercise-video-store";

type EditExerciseCommand = {
  exerciseId: string;
  draft: ExerciseDraftInput;
  video: ExerciseVideoChoice;
};

export type EditExerciseResult =
  | { status: "edited"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseSaveProblems }
  | { status: "not-found" }
  | { status: "failed" };

type EditExerciseUseCaseOptions = {
  library: ExerciseLibrary;
  clock: Clock;
  incidents: ExerciseLibraryIncidents;
  formats: ExerciseVideoFormatDetector;
  store: Pick<ExerciseVideoStore, "keep" | "discard" | "remove">;
};

export class EditExerciseUseCase {
  private readonly videos: ExerciseVideoSaving;

  constructor(private readonly options: EditExerciseUseCaseOptions) {
    this.videos = new ExerciseVideoSaving(options);
  }

  async execute(command: EditExerciseCommand): Promise<EditExerciseResult> {
    try {
      return await this.edit(command);
    } catch (error) {
      this.options.incidents.exerciseEditFailed({
        exerciseId: command.exerciseId,
        error,
      });
      await this.videos.discard(command.video);

      return { status: "failed" };
    }
  }

  private async edit({
    exerciseId,
    draft: input,
    video: choice,
  }: EditExerciseCommand): Promise<EditExerciseResult> {
    const { library, clock } = this.options;
    const [exercise, exercises] = await Promise.all([
      library.find(exerciseId),
      library.list(),
    ]);

    if (!exercise) {
      await this.videos.discard(choice);

      return { status: "not-found" };
    }

    const otherNames = exercises
      .filter(({ id }) => id !== exerciseId)
      .map(({ name }) => name);
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

    const change = await this.videos.keepAccepted(video);
    const revision = exercise.revised({
      draft: draft.draft,
      at: clock.now(),
      video: change,
    });

    if (
      (await this.videos.writeOrRemoveKept(change, () =>
        library.replace(revision.exercise),
      )) === "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    await this.videos.removeStored(revision.replacedVideo);

    return { status: "edited", exercise: revision.exercise };
  }
}
