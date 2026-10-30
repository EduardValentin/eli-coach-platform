import type { ExerciseLibraryIncidentsPort } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import {
  errorClassOf,
  errorCodeOf,
} from "~/shared/logging/error-fields.server";

export class ExerciseLibraryIncidentsAdapter implements ExerciseLibraryIncidentsPort {
  constructor(private readonly logger: LoggerPort) {}

  exerciseCreationFailed({
    error,
  }: Parameters<ExerciseLibraryIncidentsPort["exerciseCreationFailed"]>[0]) {
    this.logger.error("Exercise could not be created.", {
      errorCategory: "exercise_creation_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
    });
  }

  exerciseEditFailed({
    error,
    exerciseId,
  }: Parameters<ExerciseLibraryIncidentsPort["exerciseEditFailed"]>[0]) {
    this.logger.error("Exercise edit could not be written.", {
      errorCategory: "exercise_edit_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      exerciseId,
    });
  }

  exerciseRestoreFailed({
    error,
    exerciseId,
  }: Parameters<ExerciseLibraryIncidentsPort["exerciseRestoreFailed"]>[0]) {
    this.logger.error("Exercise restore could not be written.", {
      errorCategory: "exercise_restore_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      exerciseId,
    });
  }

  videoCleanupFailed({
    error,
    ...file
  }: Parameters<ExerciseLibraryIncidentsPort["videoCleanupFailed"]>[0]) {
    this.logger.error("Exercise video file could not be removed.", {
      errorCategory: "exercise_video_cleanup_failure",
      errorClass: errorClassOf(error),
      ...errorCodeOf(error),
      ...file,
    });
  }
}
