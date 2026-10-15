import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

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

function validDraft(input: ExerciseDraftInput): ExerciseDraft {
  const result = ExerciseDraft.from(input);

  if (result.status !== "valid") {
    throw new Error("The draft is meant to be valid.");
  }

  return result.draft;
}

describe("Exercise", () => {
  it("is added with its draft, owned by the coach who added it, created and updated at the same moment", () => {
    // arrange
    const draft = validDraft(SQUAT);

    // act
    const exercise = Exercise.added({
      id: "exercise-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft,
      at: ADDED_AT,
    });

    // assert
    expect(exercise.toSnapshot()).toEqual({
      id: "exercise-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      createdAt: ADDED_AT,
      updatedAt: ADDED_AT,
    });
  });

  it("is revised as a whole, keeping its id, its owner and the moment it was created", () => {
    // arrange
    const exercise = Exercise.added({
      id: "exercise-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: validDraft(SQUAT),
      at: ADDED_AT,
    });
    const draft = validDraft({
      ...SQUAT,
      name: "Single-leg squat",
      perSide: true,
      tags: ["Strength"],
    });

    // act
    const revised = exercise.revised(draft, REVISED_AT);

    // assert
    expect(revised.toSnapshot()).toEqual({
      id: "exercise-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      createdAt: ADDED_AT,
      updatedAt: REVISED_AT,
    });
    expect(exercise.toSnapshot().name).toBe("Back squat");
  });

  it("is reconstituted from its snapshot", () => {
    // arrange
    const snapshot = Exercise.added({
      id: "exercise-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: validDraft(SQUAT),
      at: ADDED_AT,
    }).toSnapshot();

    // act
    const exercise = Exercise.reconstitute(snapshot);

    // assert
    expect(exercise.toSnapshot()).toEqual(snapshot);
  });
});
