import { describe, expect, it } from "vitest";

import type {
  LibraryExerciseEntry,
  ListLibraryExercisesUseCase,
} from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { LibraryExercisesFacadeAdapter } from "./library-exercises-facade-adapter.server";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";
const BIKE_ID = "e0000000-0000-4000-8000-000000000002";
const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";

const HIP_THRUST: LibraryExerciseEntry = {
  id: HIP_THRUST_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: true,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: ["Hamstrings"],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  pattern: "hinge",
  role: "main-compound",
  tags: ["Strength"],
  cues: "Chin tucked.",
  video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 },
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
  status: "active",
};

const ARCHIVED_BIKE: LibraryExerciseEntry = {
  ...HIP_THRUST,
  id: BIKE_ID,
  name: "Bike",
  type: "cardio",
  unit: "time",
  perSide: false,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  pattern: null,
  role: null,
  tags: [],
  cues: "",
  video: null,
  archivedAt: AT,
  status: "archived",
};

function libraryExercisesFacadeAdapterOver(exercises: LibraryExerciseEntry[]) {
  const listedFor: string[] = [];
  let unitsOfWorkOpened = 0;
  const listLibraryExercisesUseCase = {
    execute: async (ownerAccountId: string) => {
      listedFor.push(ownerAccountId);

      return exercises;
    },
  } as unknown as ListLibraryExercisesUseCase;
  const unitOfWork: UnitOfWork = async (work) => {
    unitsOfWorkOpened += 1;

    return work();
  };

  return {
    libraryExercisesFacadeAdapter: new LibraryExercisesFacadeAdapter({
      listLibraryExercisesUseCase,
      unitOfWork,
    }),
    listedFor,
    unitsOfWorkOpened: () => unitsOfWorkOpened,
  };
}

describe("LibraryExercisesFacadeAdapter", () => {
  it("answers every exercise of the coach with its video's path and whether it is archived", async () => {
    // arrange
    const { libraryExercisesFacadeAdapter, listedFor } =
      libraryExercisesFacadeAdapterOver([HIP_THRUST, ARCHIVED_BIKE]);

    // act
    const exercises =
      await libraryExercisesFacadeAdapter.listLibraryExercises(
        COACH_ACCOUNT_ID,
      );

    // assert
    expect(exercises).toEqual([
      {
        exerciseId: HIP_THRUST_ID,
        name: "Hip thrust",
        type: "resistance",
        unit: "reps",
        perSide: true,
        primaryMuscles: ["Glutes"],
        secondaryMuscles: ["Hamstrings"],
        equipment: ["Barbell", "Bench"],
        difficulty: "Beginner",
        pattern: "hinge",
        role: "main-compound",
        tags: ["Strength"],
        cues: "Chin tucked.",
        videoPath: `/api/exercises/${HIP_THRUST_ID}/video/${VIDEO_ID}`,
        archived: false,
      },
      {
        exerciseId: BIKE_ID,
        name: "Bike",
        type: "cardio",
        unit: "time",
        perSide: false,
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: [],
        difficulty: "Beginner",
        pattern: null,
        role: null,
        tags: [],
        cues: "",
        videoPath: null,
        archived: true,
      },
    ]);
    expect(listedFor).toEqual([COACH_ACCOUNT_ID]);
  });

  it("reads inside a unit of work, so it joins the caller's", async () => {
    // arrange
    const { libraryExercisesFacadeAdapter, unitsOfWorkOpened } =
      libraryExercisesFacadeAdapterOver([]);

    // act
    await libraryExercisesFacadeAdapter.listLibraryExercises(COACH_ACCOUNT_ID);

    // assert
    expect(unitsOfWorkOpened()).toBe(1);
  });
});
