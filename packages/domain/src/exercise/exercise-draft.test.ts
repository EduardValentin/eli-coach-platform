import { describe, expect, it } from "vitest";

import { ExerciseDraft, type ExerciseDraftInput } from "./exercise-draft";
import { MAX_EXERCISE_NAME_LENGTH, MAX_FORM_CUES_LENGTH } from "./vocabulary";

const SQUAT: ExerciseDraftInput = {
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace, sit between the hips.",
};

describe("ExerciseDraft", () => {
  it("keeps every entry, the name trimmed", () => {
    // arrange
    const input = { ...SQUAT, name: "  Back squat  " };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(
      result.status === "valid" ? result.draft.toSnapshot() : result,
    ).toEqual({ ...SQUAT, name: "Back squat" });
  });

  it("keeps the form cues as entered, spaces included", () => {
    // arrange
    const input = { ...SQUAT, cues: "  Brace.\n" };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(
      result.status === "valid" ? result.draft.toSnapshot().cues : result,
    ).toBe("  Brace.\n");
  });

  it("keeps each chosen muscle, piece of equipment and tag once, in the order chosen", () => {
    // arrange
    const input = {
      ...SQUAT,
      primaryMuscles: ["Glutes", "Quadriceps", "Glutes"],
      secondaryMuscles: ["Core", "Core"],
      equipment: ["Barbell", "Barbell"],
      tags: ["Strength", "Strength"],
    };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(
      result.status === "valid" ? result.draft.toSnapshot() : result,
    ).toEqual({
      ...SQUAT,
      primaryMuscles: ["Glutes", "Quadriceps"],
      secondaryMuscles: ["Core"],
      equipment: ["Barbell"],
      tags: ["Strength"],
    });
  });

  it("names the entries its rules changed: a trimmed name and repeated choices", () => {
    // arrange
    const input = {
      ...SQUAT,
      name: ` ${SQUAT.name} `,
      primaryMuscles: ["Glutes", "Glutes"],
      tags: ["Strength", "Strength"],
    };
    const result = ExerciseDraft.from(input);

    // act
    const changed =
      result.status === "valid" && result.draft.fieldsChangedFrom(input);

    // assert
    expect(changed).toEqual(["name", "primaryMuscles", "tags"]);
  });

  it("names no entry when it keeps every one as entered", () => {
    // arrange
    const result = ExerciseDraft.from(SQUAT);

    // act
    const changed =
      result.status === "valid" && result.draft.fieldsChangedFrom(SQUAT);

    // assert
    expect(changed).toEqual([]);
  });

  it("accepts a name of 80 characters and form cues of 1,000", () => {
    // arrange
    const input = {
      ...SQUAT,
      name: "n".repeat(MAX_EXERCISE_NAME_LENGTH),
      cues: "c".repeat(MAX_FORM_CUES_LENGTH),
    };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it("counts the name's length without its surrounding spaces", () => {
    // arrange
    const input = {
      ...SQUAT,
      name: `  ${"n".repeat(MAX_EXERCISE_NAME_LENGTH)}  `,
    };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it("accepts a cardio exercise without a primary muscle and a bodyweight exercise without equipment", () => {
    // arrange
    const input = {
      ...SQUAT,
      type: "cardio",
      unit: "time",
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      tags: [],
      cues: "",
    };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it.each([
    ["a blank name", { name: "   " }, { name: "missing" }],
    [
      "a name of 81 characters",
      { name: "n".repeat(MAX_EXERCISE_NAME_LENGTH + 1) },
      { name: "too-long" },
    ],
    [
      "form cues of 1,001 characters",
      { cues: "c".repeat(MAX_FORM_CUES_LENGTH + 1) },
      { cues: "too-long" },
    ],
    [
      "form cues of 1,000 characters and a trailing space",
      { cues: `${"c".repeat(MAX_FORM_CUES_LENGTH)} ` },
      { cues: "too-long" },
    ],
    [
      "no primary muscle for a resistance exercise",
      { primaryMuscles: [] },
      { primaryMuscles: "missing" },
    ],
    [
      "no primary muscle for a mobility exercise",
      { type: "mobility", unit: "time", primaryMuscles: [] },
      { primaryMuscles: "missing" },
    ],
    [
      "a unit the type does not measure in",
      { type: "stretching", unit: "reps" },
      { unit: "not-allowed" },
    ],
    [
      "a muscle chosen as both primary and secondary",
      { secondaryMuscles: ["Glutes"] },
      { secondaryMuscles: "overlap" },
    ],
    [
      "every rule broken at once",
      {
        name: "",
        type: "breathing",
        unit: "reps",
        primaryMuscles: [],
        secondaryMuscles: ["Core"],
        cues: "c".repeat(MAX_FORM_CUES_LENGTH + 1),
      },
      {
        name: "missing",
        unit: "not-allowed",
        primaryMuscles: "missing",
        cues: "too-long",
      },
    ],
  ])("refuses %s, naming the problem", (_case, entries, problems) => {
    // arrange
    const input = { ...SQUAT, ...entries };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });

  it.each([
    ["a type", { type: "yoga" }, { type: "unknown" }],
    ["a unit", { unit: "laps" }, { unit: "unknown" }],
    ["a difficulty", { difficulty: "Expert" }, { difficulty: "unknown" }],
    [
      "a primary muscle",
      { primaryMuscles: ["Glutes", "Neck"] },
      { primaryMuscles: "unknown" },
    ],
    [
      "a secondary muscle",
      { secondaryMuscles: ["Neck"] },
      { secondaryMuscles: "unknown" },
    ],
    ["a piece of equipment", { equipment: ["Sled"] }, { equipment: "unknown" }],
    ["a tag", { tags: ["Power"] }, { tags: "unknown" }],
    [
      "several values",
      { type: "yoga", tags: ["Power"] },
      { type: "unknown", tags: "unknown" },
    ],
  ])(
    "refuses %s outside the library's vocabulary",
    (_case, entries, problems) => {
      // arrange
      const input = { ...SQUAT, ...entries };

      // act
      const result = ExerciseDraft.from(input);

      // assert
      expect(result).toEqual({ status: "invalid", problems });
    },
  );

  it("leaves the name's availability to the library: it accepts a name another exercise may have", () => {
    // arrange
    const input = { ...SQUAT, name: "Hip thrust" };

    // act
    const result = ExerciseDraft.from(input);

    // assert
    expect(result.status).toBe("valid");
  });
});
