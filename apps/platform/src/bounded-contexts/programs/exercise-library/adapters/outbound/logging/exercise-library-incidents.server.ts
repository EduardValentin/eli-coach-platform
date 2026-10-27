import type { ExerciseLibraryIncidents } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { Logger } from "~/shared/logging/console-logger.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export function createExerciseLibraryIncidents(
  logger: Logger,
): ExerciseLibraryIncidents {
  return {
    exerciseCreationFailed: ({ error }) => {
      logger.error("Exercise could not be created.", {
        errorCategory: "exercise_creation_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
      });
    },
    exerciseEditFailed: ({ error, exerciseId }) => {
      logger.error("Exercise edit could not be written.", {
        errorCategory: "exercise_edit_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        exerciseId,
      });
    },
    exerciseRestoreFailed: ({ error, exerciseId }) => {
      logger.error("Exercise restore could not be written.", {
        errorCategory: "exercise_restore_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        exerciseId,
      });
    },
    videoCleanupFailed: ({ error, ...file }) => {
      logger.error("Exercise video file could not be removed.", {
        errorCategory: "exercise_video_cleanup_failure",
        errorClass: errorClassOf(error),
        ...errorCodeOf(error),
        ...file,
      });
    },
  };
}
