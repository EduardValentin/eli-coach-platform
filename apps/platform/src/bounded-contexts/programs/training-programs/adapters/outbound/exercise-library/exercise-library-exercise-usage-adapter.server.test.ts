import { describe, expect, it } from "vitest";

import type {
  ExerciseUsageFacade,
  VersionExerciseUsage,
  VersionExerciseUsageRecording,
} from "~/bounded-contexts/programs/exercise-library/public/exercise-usage-facade";

import { ExerciseLibraryExerciseUsageAdapter } from "./exercise-library-exercise-usage-adapter.server";

class ExerciseUsageFacadeDouble implements ExerciseUsageFacade {
  readonly recorded: VersionExerciseUsage[] = [];

  constructor(
    private readonly recording: VersionExerciseUsageRecording = {
      status: "recorded",
    },
  ) {}

  async recordVersionUsage(
    usage: VersionExerciseUsage,
  ): Promise<VersionExerciseUsageRecording> {
    this.recorded.push(usage);

    return this.recording;
  }
}

describe("ExerciseLibraryExerciseUsageAdapter", () => {
  it("hands the library the exercises one program version uses, for the coach", async () => {
    // arrange
    const exerciseUsageFacadeDouble = new ExerciseUsageFacadeDouble();
    const exerciseLibraryExerciseUsageAdapter =
      new ExerciseLibraryExerciseUsageAdapter(exerciseUsageFacadeDouble);

    // act
    await exerciseLibraryExerciseUsageAdapter.recordVersionUsage({
      coachAccountId: "coach-account-1",
      programId: "program-1",
      versionNumber: 2,
      exerciseIds: ["exercise-1", "exercise-2"],
    });

    // assert
    expect(exerciseUsageFacadeDouble.recorded).toEqual([
      {
        coachAccountId: "coach-account-1",
        programId: "program-1",
        versionNumber: 2,
        exerciseIds: ["exercise-1", "exercise-2"],
      },
    ]);
  });

  it("fails when the library knows one of the exercises as none of the coach's, so the caller's unit of work rolls back", async () => {
    // arrange
    const exerciseLibraryExerciseUsageAdapter =
      new ExerciseLibraryExerciseUsageAdapter(
        new ExerciseUsageFacadeDouble({ status: "unknown-exercise" }),
      );

    // act
    const recorded = exerciseLibraryExerciseUsageAdapter.recordVersionUsage({
      coachAccountId: "coach-account-1",
      programId: "program-1",
      versionNumber: 1,
      exerciseIds: ["exercise-9"],
    });

    // assert
    await expect(recorded).rejects.toThrow(
      "The library refused program program-1 version 1's exercises: unknown-exercise.",
    );
  });
});
