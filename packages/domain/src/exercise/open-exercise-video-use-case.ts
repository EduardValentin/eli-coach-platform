import type { ExerciseLibrary } from "./exercise-library";
import { ExerciseVideoAccess } from "./exercise-video-access";
import type {
  ExerciseVideoStore,
  RequestedByteRange,
  ServedByteRange,
} from "./exercise-video-store";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";

type OpenExerciseVideoCommand = {
  viewer: ExerciseVideoViewer;
  exerciseId: string;
  videoId: string;
  requested: RequestedByteRange | null;
};

export type OpenExerciseVideoResult =
  | {
      status: "opened";
      mediaType: string;
      bytes: AsyncIterable<Uint8Array>;
      sizeBytes: number;
      served: ServedByteRange | "whole";
    }
  | { status: "unsatisfiable"; sizeBytes: number }
  | { status: "not-found" };

type OpenExerciseVideoUseCaseOptions = {
  library: Pick<ExerciseLibrary, "find">;
  store: Pick<ExerciseVideoStore, "open">;
};

const NOT_FOUND: OpenExerciseVideoResult = { status: "not-found" };

export class OpenExerciseVideoUseCase {
  private readonly access = new ExerciseVideoAccess();

  constructor(private readonly options: OpenExerciseVideoUseCaseOptions) {}

  async execute(
    command: OpenExerciseVideoCommand,
  ): Promise<OpenExerciseVideoResult> {
    const ownerAccountId = await this.access.libraryOwnerAccountIdFor(
      command.viewer,
    );

    if (!ownerAccountId) return NOT_FOUND;

    const exercise = await this.options.library.find({
      ownerAccountId,
      exerciseId: command.exerciseId,
    });

    if (!exercise) return NOT_FOUND;
    if (!(await this.access.admits(command.viewer, exercise))) return NOT_FOUND;

    const video = exercise.video;

    if (!video?.isStoredAs(command.videoId)) return NOT_FOUND;

    const opening = await this.options.store.open(
      video.videoId,
      command.requested,
    );

    switch (opening.status) {
      case "missing":
        return NOT_FOUND;
      case "unsatisfiable":
        return opening;
      case "opened":
        return { ...opening, mediaType: video.mediaType };
    }
  }
}
