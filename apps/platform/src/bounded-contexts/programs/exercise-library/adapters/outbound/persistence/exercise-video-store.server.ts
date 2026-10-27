import type { ExerciseVideoStore } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

import { FilesystemExerciseVideoStore } from "./filesystem-exercise-video-store.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createExerciseVideoStore(root: string): ExerciseVideoStore {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Exercise video root is not ready.");
  }

  return new FilesystemExerciseVideoStore(root);
}
