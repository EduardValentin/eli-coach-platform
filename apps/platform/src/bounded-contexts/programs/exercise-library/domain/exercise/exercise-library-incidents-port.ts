type ExerciseCreationFailedIncident = {
  error: unknown;
};

type ExerciseEditFailedIncident = {
  exerciseId: string;
  error: unknown;
};

type ExerciseRestoreFailedIncident = {
  exerciseId: string;
  error: unknown;
};

export type UncleanedExerciseVideoFile =
  { stagingId: string } | { videoId: string };

type ExerciseVideoCleanupFailedIncident = UncleanedExerciseVideoFile & {
  error: unknown;
};

export interface ExerciseLibraryIncidentsPort {
  exerciseCreationFailed(incident: ExerciseCreationFailedIncident): void;
  exerciseEditFailed(incident: ExerciseEditFailedIncident): void;
  exerciseRestoreFailed(incident: ExerciseRestoreFailedIncident): void;
  videoCleanupFailed(incident: ExerciseVideoCleanupFailedIncident): void;
}
