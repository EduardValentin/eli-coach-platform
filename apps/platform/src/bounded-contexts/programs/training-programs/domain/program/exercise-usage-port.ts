export type VersionExerciseUsage = {
  coachAccountId: string;
  programId: string;
  versionNumber: number;
  exerciseIds: readonly string[];
};

export interface ExerciseUsagePort {
  recordVersionUsage(usage: VersionExerciseUsage): Promise<void>;
}
