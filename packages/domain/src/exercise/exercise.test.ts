import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import { ExerciseVideo } from "./exercise-video";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");

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

const FIRST_VIDEO = ExerciseVideo.of({
  videoId: "video-1",
  format: "mp4",
  sizeBytes: 2_048,
});
const SECOND_VIDEO = ExerciseVideo.of({
  videoId: "video-2",
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
    id: "exercise-1",
    draft: validDraft(SQUAT),
    at: ADDED_AT,
    video: video ? { kind: "attach", video } : { kind: "keep" },
  });
}

describe("Exercise", () => {
  it("is added with its draft and no video, created and updated at the same moment", () => {
    // arrange
    const draft = validDraft(SQUAT);

    // act
    const exercise = Exercise.added({
      id: "exercise-1",
      draft,
      at: ADDED_AT,
      video: { kind: "keep" },
    });

    // assert
    expect(exercise.toSnapshot()).toEqual({
      id: "exercise-1",
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
    expect(exercise.video?.isStoredAs("video-1")).toBe(true);
  });

  it("is revised as a whole, keeping its id, its video and the moment it was created", () => {
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
      id: "exercise-1",
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
