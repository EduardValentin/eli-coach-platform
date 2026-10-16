import type { Clock } from "../shared";
import { Exercise, type ExerciseSaveProblems } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseIds } from "./exercise-ids";
import type { ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import {
  ExerciseVideoSaving,
  type ExerciseVideoChoice,
} from "./exercise-video-saving";
import type { ExerciseVideoStore } from "./exercise-video-store";

type CreateExerciseCommand = {
  ownerAccountId: string;
  draft: ExerciseDraftInput;
  video: ExerciseVideoChoice;
};

export type CreateExerciseResult =
  | { status: "created"; exercise: Exercise }
  | { status: "invalid"; problems: ExerciseSaveProblems }
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
  private readonly videos: ExerciseVideoSaving;

  constructor(private readonly options: CreateExerciseUseCaseOptions) {
    this.videos = new ExerciseVideoSaving(options);
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
    ownerAccountId,
    draft: input,
    video: choice,
  }: CreateExerciseCommand): Promise<CreateExerciseResult> {
    const { library, ids, clock } = this.options;
    const otherNames = (await library.list(ownerAccountId)).map(
      ({ name }) => name,
    );
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
    const exercise = Exercise.added({
      id: ids.generate(),
      ownerAccountId,
      draft: draft.draft,
      at: clock.now(),
      video: change,
    });

    if (
      (await this.videos.writeOrRemoveKept(change, () =>
        library.add(exercise),
      )) === "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", exercise };
  }
}
