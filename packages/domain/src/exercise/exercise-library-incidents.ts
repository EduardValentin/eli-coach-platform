type ExerciseCreationFailedIncident = {
  error: unknown;
};

type ExerciseEditFailedIncident = {
  exerciseId: string;
  error: unknown;
};

type ExerciseVideoCleanupFailedIncident = {
  videoId: string;
  error: unknown;
};

export interface ExerciseLibraryIncidents {
  exerciseCreationFailed(incident: ExerciseCreationFailedIncident): void;
  exerciseEditFailed(incident: ExerciseEditFailedIncident): void;
  videoCleanupFailed(incident: ExerciseVideoCleanupFailedIncident): void;
}
