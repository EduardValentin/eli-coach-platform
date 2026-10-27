import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseVideoAccess } from "./exercise-video-access";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";

const STORED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";

const SQUAT = Exercise.reconstitute({
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: [],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: {
    videoId: "9c1b0000-0000-4000-8000-000000000001",
    format: "mp4",
    sizeBytes: 2_048,
  },
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

const COACH: ExerciseVideoViewer = {
  kind: "coach",
  accountId: COACH_ACCOUNT_ID,
};
const CLIENT: ExerciseVideoViewer = {
  kind: "client",
  authSubjectId: "user_1",
};
const VISITOR: ExerciseVideoViewer = { kind: "visitor" };

describe("ExerciseVideoAccess", () => {
  it.each<{ viewer: ExerciseVideoViewer; owner: string | null }>([
    { viewer: COACH, owner: COACH_ACCOUNT_ID },
    { viewer: CLIENT, owner: null },
    { viewer: VISITOR, owner: null },
  ])(
    "looks in the library owned by $owner for a $viewer.kind's video",
    async ({ viewer, owner }) => {
      // arrange
      const access = new ExerciseVideoAccess();

      // act
      const libraryOwner = await access.libraryOwnerAccountIdFor(viewer);

      // assert
      expect(libraryOwner).toBe(owner);
    },
  );

  it.each<{ viewer: ExerciseVideoViewer; admitted: boolean }>([
    { viewer: COACH, admitted: true },
    { viewer: CLIENT, admitted: false },
    { viewer: VISITOR, admitted: false },
  ])(
    "lets a $viewer.kind play the video: $admitted",
    async ({ viewer, admitted }) => {
      // arrange
      const access = new ExerciseVideoAccess();

      // act
      const admits = await access.admits(viewer, SQUAT);

      // assert
      expect(admits).toBe(admitted);
    },
  );
});
