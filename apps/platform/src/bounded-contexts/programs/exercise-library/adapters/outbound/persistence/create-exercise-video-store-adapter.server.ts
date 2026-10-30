import type { ExerciseVideoStorePort } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

import { FilesystemExerciseVideoStoreAdapter } from "./filesystem-exercise-video-store-adapter.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createExerciseVideoStoreAdapter(
  root: string,
): ExerciseVideoStorePort {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Exercise video root is not ready.");
  }

  return new FilesystemExerciseVideoStoreAdapter(root);
}
