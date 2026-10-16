type ExerciseCreationFailedIncident = {
  error: unknown;
};

type ExerciseEditFailedIncident = {
  exerciseId: string;
  error: unknown;
};

export type UncleanedExerciseVideoFile =
  { stagingId: string } | { videoId: string };

type ExerciseVideoCleanupFailedIncident = UncleanedExerciseVideoFile & {
  error: unknown;
};

export interface ExerciseLibraryIncidents {
  exerciseCreationFailed(incident: ExerciseCreationFailedIncident): void;
  exerciseEditFailed(incident: ExerciseEditFailedIncident): void;
  videoCleanupFailed(incident: ExerciseVideoCleanupFailedIncident): void;
}
