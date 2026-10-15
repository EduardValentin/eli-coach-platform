import type { ExerciseVideoStore } from "@eli-coach-platform/domain/exercise";

import { FilesystemExerciseVideoStore } from "./filesystem/filesystem-exercise-video-store.server";
import { isReadyMediaRoot } from "./filesystem/media-root.server";

export function createExerciseVideoStore(root: string): ExerciseVideoStore {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Exercise video root is not ready.");
  }

  return new FilesystemExerciseVideoStore(root);
}
