import type { ExerciseVideoFormatDetectorPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise";

import { FileTypeExerciseVideoFormatDetectorAdapter } from "./file-type-exercise-video-format-detector-adapter.server";

export function createExerciseVideoFormatDetectorAdapter(): ExerciseVideoFormatDetectorPort {
  return new FileTypeExerciseVideoFormatDetectorAdapter();
}
