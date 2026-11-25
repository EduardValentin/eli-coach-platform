import { describe, expect, it, vi } from "vitest";

import { Exercise, type ExerciseSnapshot } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseProgramCounts,
} from "./exercise-library-port";
import { ListExercisesUseCase } from "./list-exercises-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";
const LUNGE_ID = "e0000000-0000-4000-8000-000000000002";

const HIP_THRUST: ExerciseSnapshot = {
  id: HIP_THRUST_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  pattern: "squat",
  role: "main-compound",
  tags: ["Hypertrophy"],
  cues: "",
  video: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const ARCHIVED_LUNGE: ExerciseSnapshot = {
  ...HIP_THRUST,
  id: LUNGE_ID,
  name: "Lunge",
  archivedAt: AT,
};

function createUseCase(programCounts: ExerciseProgramCounts) {
  const library = {
    list: vi.fn(async (_ownerAccountId: string) => [
      Exercise.reconstitute(HIP_THRUST),
      Exercise.reconstitute(ARCHIVED_LUNGE),
    ]),
    programCountsOf: vi.fn(async (_ownerAccountId: string) => programCounts),
  } satisfies Pick<ExerciseLibraryPort, "list" | "programCountsOf">;
  const listExercisesUseCase = new ListExercisesUseCase({
    exerciseLibraryPort: library,
  });

  return { listExercisesUseCase, library };
}

describe("ListExercisesUseCase", () => {
  it("lists every exercise of hers in the order the library keeps them, with how many programs use each", async () => {
    // arrange
    const { listExercisesUseCase, library } = createUseCase(
      new Map([[HIP_THRUST_ID, 2]]),
    );

    // act
    const result = await listExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result.exercises).toEqual([
      { ...HIP_THRUST, status: "active", programCount: 2 },
      { ...ARCHIVED_LUNGE, status: "archived", programCount: 0 },
    ]);
    expect(library.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
    expect(library.programCountsOf).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
  });

  it("reserves the names of her active exercises", async () => {
    // arrange
    const { listExercisesUseCase } = createUseCase(new Map());

    // act
    const result = await listExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result.reservedNames).toEqual(["Hip thrust"]);
  });
});
