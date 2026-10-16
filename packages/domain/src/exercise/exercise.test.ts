import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import { ExerciseVideo } from "./exercise-video";
import { InvalidStoredExerciseError } from "./invalid-stored-exercise-error";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";

const SQUAT: ExerciseDraftInput = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
};

const FIRST_VIDEO = ExerciseVideo.fromStored({
  videoId: "9c1b0000-0000-4000-8000-000000000001",
  format: "mp4",
  sizeBytes: 2_048,
});
const SECOND_VIDEO = ExerciseVideo.fromStored({
  videoId: "9c1b0000-0000-4000-8000-000000000002",
  format: "mov",
  sizeBytes: 4_096,
});

function validDraft(input: ExerciseDraftInput): ExerciseDraft {
  const result = ExerciseDraft.from(input);

  if (result.status !== "valid") {
    throw new Error("The draft is meant to be valid.");
  }

  return result.draft;
}

function addedWith(video: ExerciseVideo | null): Exercise {
  return Exercise.added({
    id: "e0000000-0000-4000-8000-000000000001",
    ownerAccountId: COACH_ACCOUNT_ID,
    draft: validDraft(SQUAT),
    at: ADDED_AT,
    video: video ? { kind: "attach", video } : { kind: "keep" },
  });
}

describe("Exercise", () => {
  it("is added with its draft and no video, owned by the coach who added it, created and updated at the same moment", () => {
    // arrange
    const draft = validDraft(SQUAT);

    // act
    const exercise = Exercise.added({
      id: "e0000000-0000-4000-8000-000000000001",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft,
      at: ADDED_AT,
      video: { kind: "keep" },
    });

    // assert
    expect(exercise.toSnapshot()).toEqual({
      id: "e0000000-0000-4000-8000-000000000001",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      video: null,
      createdAt: ADDED_AT,
      updatedAt: ADDED_AT,
    });
    expect(exercise.video).toBeNull();
  });

  it("is added with the video attached to it", () => {
    // arrange
    const video = FIRST_VIDEO;

    // act
    const exercise = addedWith(video);

    // assert
    expect(exercise.toSnapshot().video).toEqual(video.toSnapshot());
    expect(
      exercise.video?.isStoredAs("9c1b0000-0000-4000-8000-000000000001"),
    ).toBe(true);
  });

  it("is revised as a whole, keeping its id, its owner, its video and the moment it was created", () => {
    // arrange
    const exercise = addedWith(FIRST_VIDEO);
    const draft = validDraft({
      ...SQUAT,
      name: "Single-leg squat",
      perSide: true,
      tags: ["Strength"],
    });

    // act
    const revision = exercise.revised({
      draft,
      at: REVISED_AT,
      video: { kind: "keep" },
    });

    // assert
    expect(revision.exercise.toSnapshot()).toEqual({
      id: "e0000000-0000-4000-8000-000000000001",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      video: FIRST_VIDEO.toSnapshot(),
      createdAt: ADDED_AT,
      updatedAt: REVISED_AT,
    });
    expect(revision.replacedVideo).toBeNull();
    expect(exercise.toSnapshot().name).toBe("Back squat");
  });

  it("replaces its video with a newly attached one and reports the replaced one", () => {
    // arrange
    const exercise = addedWith(FIRST_VIDEO);

    // act
    const revision = exercise.revised({
      draft: validDraft(SQUAT),
      at: REVISED_AT,
      video: { kind: "attach", video: SECOND_VIDEO },
    });

    // assert
    expect(revision.exercise.toSnapshot().video).toEqual(
      SECOND_VIDEO.toSnapshot(),
    );
    expect(revision.replacedVideo?.toSnapshot()).toEqual(
      FIRST_VIDEO.toSnapshot(),
    );
  });

  it("drops its video when removed and reports the removed one", () => {
    // arrange
    const exercise = addedWith(FIRST_VIDEO);

    // act
    const revision = exercise.revised({
      draft: validDraft(SQUAT),
      at: REVISED_AT,
      video: { kind: "remove" },
    });

    // assert
    expect(revision.exercise.video).toBeNull();
    expect(revision.replacedVideo?.toSnapshot()).toEqual(
      FIRST_VIDEO.toSnapshot(),
    );
  });

  it("reports nothing replaced when an exercise without a video removes it", () => {
    // arrange
    const exercise = addedWith(null);

    // act
    const revision = exercise.revised({
      draft: validDraft(SQUAT),
      at: REVISED_AT,
      video: { kind: "remove" },
    });

    // assert
    expect(revision.exercise.video).toBeNull();
    expect(revision.replacedVideo).toBeNull();
  });

  it("is reconstituted from its snapshot", () => {
    // arrange
    const snapshot = addedWith(FIRST_VIDEO).toSnapshot();

    // act
    const exercise = Exercise.reconstitute(snapshot);

    // assert
    expect(exercise.toSnapshot()).toEqual(snapshot);
  });
});

describe("Exercise.reconstitute", () => {
  const STORED = {
    id: "e0000000-0000-4000-8000-000000000001",
    ownerAccountId: COACH_ACCOUNT_ID,
    ...SQUAT,
    primaryMuscles: ["Quadriceps"],
    secondaryMuscles: ["Glutes"],
    equipment: ["Barbell"],
    tags: ["Strength"],
    video: FIRST_VIDEO.toSnapshot(),
    createdAt: ADDED_AT,
    updatedAt: REVISED_AT,
  };

  it.each([
    { description: "a stored exercise", change: {} },
    {
      description: "a cardio exercise without a primary muscle",
      change: { type: "cardio", unit: "time", primaryMuscles: [] },
    },
    { description: "an 80-character name", change: { name: "n".repeat(80) } },
    {
      description: "1,000 characters of form cues",
      change: { cues: "c".repeat(1_000) },
    },
    { description: "no video", change: { video: null } },
  ])("reads back $description as it was stored", ({ change }) => {
    // arrange
    const stored = { ...STORED, ...change };

    // act
    const exercise = Exercise.reconstitute(stored);

    // assert
    expect(exercise.toSnapshot()).toEqual(stored);
  });

  it.each([
    {
      description: "an id that is no UUID",
      field: "id",
      change: { id: "exercise-1" },
    },
    {
      description: "an owner that is no UUID",
      field: "ownerAccountId",
      change: { ownerAccountId: "acct_eli" },
    },
    { description: "a blank name", field: "name", change: { name: "   " } },
    {
      description: "a name with surrounding spaces",
      field: "name",
      change: { name: " Back squat " },
    },
    {
      description: "a name over 80 characters",
      field: "name",
      change: { name: "n".repeat(81) },
    },
    {
      description: "form cues over 1,000 characters",
      field: "cues",
      change: { cues: "c".repeat(1_001) },
    },
    { description: "an unknown type", field: "type", change: { type: "yoga" } },
    { description: "an unknown unit", field: "unit", change: { unit: "laps" } },
    {
      description: "a unit its type does not allow",
      field: "unit",
      change: { type: "stretching", unit: "reps" },
    },
    {
      description: "an unknown difficulty",
      field: "difficulty",
      change: { difficulty: "Expert" },
    },
    {
      description: "no primary muscle for a type other than cardio",
      field: "primaryMuscles",
      change: { primaryMuscles: [] },
    },
    {
      description: "an unknown primary muscle",
      field: "primaryMuscles",
      change: { primaryMuscles: ["Wings"] },
    },
    {
      description: "a repeated primary muscle",
      field: "primaryMuscles",
      change: { primaryMuscles: ["Quadriceps", "Quadriceps"] },
    },
    {
      description: "an unknown secondary muscle",
      field: "secondaryMuscles",
      change: { secondaryMuscles: ["Wings"] },
    },
    {
      description: "a secondary muscle that is also primary",
      field: "secondaryMuscles",
      change: { secondaryMuscles: ["Quadriceps"] },
    },
    {
      description: "unknown equipment",
      field: "equipment",
      change: { equipment: ["Sled"] },
    },
    {
      description: "repeated equipment",
      field: "equipment",
      change: { equipment: ["Barbell", "Barbell"] },
    },
    {
      description: "an unknown tag",
      field: "tags",
      change: { tags: ["Power"] },
    },
    {
      description: "a repeated tag",
      field: "tags",
      change: { tags: ["Strength", "Strength"] },
    },
    {
      description: "a video that breaks the video rules",
      field: "video.sizeBytes",
      change: { video: { ...FIRST_VIDEO.toSnapshot(), sizeBytes: 0 } },
    },
  ])("refuses a stored exercise with $description", ({ field, change }) => {
    // arrange
    const stored = { ...STORED, ...change };

    // act
    const reading = () => Exercise.reconstitute(stored);

    // assert
    expect(reading).toThrow(InvalidStoredExerciseError);
    expect(reading).toThrow(field);
  });
});
