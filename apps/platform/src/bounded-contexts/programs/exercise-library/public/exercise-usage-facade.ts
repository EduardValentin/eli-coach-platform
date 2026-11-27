export type VersionExerciseUsage = {
  coachAccountId: string;
  programId: string;
  versionNumber: number;
  exerciseIds: string[];
};

export type VersionExerciseUsageRecording =
  { status: "recorded" } | { status: "unknown-exercise" };

export interface ExerciseUsageFacade {
  recordVersionUsage(
    usage: VersionExerciseUsage,
  ): Promise<VersionExerciseUsageRecording>;
}
