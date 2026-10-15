type ExerciseCreationFailedIncident = {
  error: unknown;
};

type ExerciseEditFailedIncident = {
  exerciseId: string;
  error: unknown;
};

export interface ExerciseLibraryIncidents {
  exerciseCreationFailed(incident: ExerciseCreationFailedIncident): void;
  exerciseEditFailed(incident: ExerciseEditFailedIncident): void;
}
