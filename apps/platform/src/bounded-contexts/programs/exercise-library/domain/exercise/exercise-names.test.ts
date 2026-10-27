import { describe, expect, it } from "vitest";

import { Exercise } from "./exercise";
import { ExerciseNames } from "./exercise-names";

const AT = new Date("2026-10-14T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-15T09:00:00.000Z");

function exerciseCalled(id: string, name: string): Exercise {
  return Exercise.reconstitute({
    id,
    ownerAccountId: "c0000000-0000-4000-8000-000000000001",
    name,
    type: "resistance",
    unit: "reps",
    perSide: false,
    primaryMuscles: ["Glutes"],
    secondaryMuscles: [],
    equipment: [],
    difficulty: "Beginner",
    tags: [],
    cues: "",
    video: null,
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
  });
}

const HIP_THRUST = exerciseCalled(
  "e0000000-0000-4000-8000-000000000001",
  "Hip thrust",
);
const BACK_SQUAT = exerciseCalled(
  "e0000000-0000-4000-8000-000000000002",
  "Back squat",
);
const ARCHIVED_LUNGE = exerciseCalled(
  "e0000000-0000-4000-8000-000000000003",
  "Lunge",
).archived(ARCHIVED_AT);

describe("ExerciseNames", () => {
  it.each([
    ["the same name", "Hip thrust"],
    ["a differently cased name", "HIP THRUST"],
    ["a name with surrounding spaces", "  hip Thrust "],
  ])("holds %s as taken", (_case, name) => {
    // arrange
    const names = ExerciseNames.of(["Back squat", "Hip thrust"]);

    // act
    const taken = names.includes(name);

    // assert
    expect(taken).toBe(true);
  });

  it("holds a name none of them has as free", () => {
    // arrange
    const names = ExerciseNames.of(["Hip thrust", "Back squats"]);

    // act
    const taken = names.includes("Back squat");

    // assert
    expect(taken).toBe(false);
  });

  it("holds a name added to them as taken", () => {
    // arrange
    const names = ExerciseNames.of(["Hip thrust"]);

    // act
    const added = names.with("Back squat");

    // assert
    expect(added.toArray()).toEqual(["Hip thrust", "Back squat"]);
    expect(names.toArray()).toEqual(["Hip thrust"]);
  });
});

describe("ExerciseNames.reservedBy", () => {
  it("reserves the names of the active exercises only", () => {
    // arrange
    const exercises = [HIP_THRUST, ARCHIVED_LUNGE, BACK_SQUAT];

    // act
    const names = ExerciseNames.reservedBy(exercises);

    // assert
    expect(names.toArray()).toEqual(["Hip thrust", "Back squat"]);
    expect(names.includes("Lunge")).toBe(false);
  });

  it("leaves out the exercise it is asked to except", () => {
    // arrange
    const exercises = [HIP_THRUST, ARCHIVED_LUNGE, BACK_SQUAT];

    // act
    const names = ExerciseNames.reservedBy(exercises, HIP_THRUST.id);

    // assert
    expect(names.toArray()).toEqual(["Back squat"]);
  });
});

describe("ExerciseNames.freeVariantOf", () => {
  it("keeps a name none of them holds", () => {
    // arrange
    const names = ExerciseNames.of(["Back squat"]);

    // act
    const free = names.freeVariantOf("Hip thrust");

    // assert
    expect(free).toBe("Hip thrust");
  });

  it("numbers a held name from 2", () => {
    // arrange
    const names = ExerciseNames.of(["Hip thrust"]);

    // act
    const free = names.freeVariantOf("Hip thrust");

    // assert
    expect(free).toBe("Hip thrust (2)");
  });

  it("skips to the next number when the numbered name is held too", () => {
    // arrange
    const names = ExerciseNames.of(["Hip thrust", "Hip thrust (2)"]);

    // act
    const free = names.freeVariantOf("Hip thrust");

    // assert
    expect(free).toBe("Hip thrust (3)");
  });

  it("compares the held names ignoring case and surrounding spaces", () => {
    // arrange
    const names = ExerciseNames.of([" HIP THRUST", "hip thrust (2) "]);

    // act
    const free = names.freeVariantOf("Hip thrust");

    // assert
    expect(free).toBe("Hip thrust (3)");
  });

  it("shortens the name so the numbered one stays within 80 characters", () => {
    // arrange
    const name = "n".repeat(80);
    const names = ExerciseNames.of([name]);

    // act
    const free = names.freeVariantOf(name);

    // assert
    expect(free).toBe(`${"n".repeat(76)} (2)`);
  });

  it("drops the spaces the shortening leaves at the end of the name", () => {
    // arrange
    const name = `${"n".repeat(75)} nnnn`;
    const names = ExerciseNames.of([name]);

    // act
    const free = names.freeVariantOf(name);

    // assert
    expect(free).toBe(`${"n".repeat(75)} (2)`);
  });
});
