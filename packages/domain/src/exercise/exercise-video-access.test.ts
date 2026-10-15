import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseVideoAccess } from "./exercise-video-access";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";

const STORED_AT = new Date("2026-10-15T09:00:00.000Z");

const SQUAT = Exercise.reconstitute({
  id: "exercise-1",
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
  video: { fileId: "video-1", format: "mp4", sizeBytes: 2_048 },
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

describe("ExerciseVideoAccess", () => {
  it.each<{ viewer: ExerciseVideoViewer; admitted: boolean }>([
    { viewer: { kind: "coach" }, admitted: true },
    { viewer: { kind: "client", authSubjectId: "user_1" }, admitted: false },
    { viewer: { kind: "visitor" }, admitted: false },
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
