import type { ClockPort } from "../clock-port";
import type { Exercise, ExerciseSaveProblems } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import { ExerciseNames } from "./exercise-names";
import type { ExerciseVideoFormatDetectorPort } from "./exercise-video-format-detector-port";
import type { ExerciseVideoIdsPort } from "./exercise-video-ids-port";
import {
  ExerciseVideoSaving,
  type ExerciseVideoChoice,
} from "./exercise-video-saving";
import type { ExerciseVideoStorePort } from "./exercise-video-store-port";

type EditExerciseCommand = ExerciseReference & {
  draft: ExerciseDraftInput;
  video: ExerciseVideoChoice;
};

export type EditExerciseResult =
  | { status: "edited"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseSaveProblems }
  | { status: "not-found" }
  | { status: "archived" }
  | { status: "failed" };

type EditExerciseUseCaseOptions = {
  library: ExerciseLibraryPort;
  clock: ClockPort;
  incidents: ExerciseLibraryIncidentsPort;
  formats: ExerciseVideoFormatDetectorPort;
  videoIds: ExerciseVideoIdsPort;
  store: Pick<ExerciseVideoStorePort, "keep" | "discard" | "remove">;
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
    ownerAccountId,
    exerciseId,
    draft: input,
    video: choice,
  }: EditExerciseCommand): Promise<EditExerciseResult> {
    const { library, clock } = this.options;
    const [exercise, exercises] = await Promise.all([
      library.find({ ownerAccountId, exerciseId }),
      library.list(ownerAccountId),
    ]);

    if (!exercise) {
      await this.videos.discard(choice);

      return { status: "not-found" };
    }

    if (exercise.status === "archived") {
      await this.videos.discard(choice);

      return { status: "archived" };
    }

    const otherNames = ExerciseNames.reservedBy(exercises, exerciseId);
    const draft = ExerciseDraft.from(input);
    const nameTaken = otherNames.includes(input.name);
    const video = await this.videos.judged(choice);

    if (draft.status === "invalid" || nameTaken || video.kind === "refused") {
      await this.videos.discard(choice);

      return {
        status: "invalid",
        problems: {
          ...(nameTaken && { name: "taken" as const }),
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
