import type { ClockPort } from "../clock-port";
import { Exercise, type ExerciseSaveProblems } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseIdsPort } from "./exercise-ids-port";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import { ExerciseNames } from "./exercise-names";
import type { ExerciseVideoFormatDetectorPort } from "./exercise-video-format-detector-port";
import type { ExerciseVideoIdsPort } from "./exercise-video-ids-port";
import {
  ExerciseVideoSaving,
  type ExerciseVideoChoice,
} from "./exercise-video-saving";
import type { ExerciseVideoStorePort } from "./exercise-video-store-port";

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
  exerciseLibraryPort: ExerciseLibraryPort;
  exerciseIdsPort: ExerciseIdsPort;
  clockPort: ClockPort;
  exerciseLibraryIncidentsPort: ExerciseLibraryIncidentsPort;
  exerciseVideoFormatDetectorPort: ExerciseVideoFormatDetectorPort;
  exerciseVideoIdsPort: ExerciseVideoIdsPort;
  exerciseVideoStorePort: Pick<
    ExerciseVideoStorePort,
    "keep" | "discard" | "remove"
  >;
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
      this.options.exerciseLibraryIncidentsPort.exerciseCreationFailed({
        error,
      });
      await this.videos.discard(command.video);

      return { status: "failed" };
    }
  }

  private async create({
    ownerAccountId,
    draft: input,
    video: choice,
  }: CreateExerciseCommand): Promise<CreateExerciseResult> {
    const { exerciseLibraryPort, exerciseIdsPort, clockPort } = this.options;
    const otherNames = ExerciseNames.reservedBy(
      await exerciseLibraryPort.list(ownerAccountId),
    );
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
    const exercise = Exercise.added({
      id: exerciseIdsPort.generate(),
      ownerAccountId,
      draft: draft.draft,
      at: clockPort.now(),
      video: change,
    });

    if (
      (await this.videos.writeOrRemoveKept(change, () =>
        exerciseLibraryPort.add(exercise),
      )) === "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", exercise };
  }
}
