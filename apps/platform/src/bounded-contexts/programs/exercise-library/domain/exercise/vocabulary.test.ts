import { describe, expect, it } from "vitest";

import {
  DIFFICULTIES,
  EQUIPMENT,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  MAX_EXERCISE_NAME_LENGTH,
  MAX_FORM_CUES_LENGTH,
  MUSCLES,
  defaultUnitFor,
  unitsFor,
} from "./vocabulary";

describe("exercise vocabulary", () => {
  it("holds the five types, the four units, the three difficulties and the three tags in the library's order", () => {
    // arrange
    const expected = {
      types: ["resistance", "cardio", "mobility", "stretching", "breathing"],
      units: ["reps", "time", "distance", "breaths"],
      difficulties: ["Beginner", "Intermediate", "Advanced"],
      tags: ["Strength", "Hypertrophy", "Recovery"],
    };

    // act
    const vocabulary = {
      types: EXERCISE_TYPES,
      units: EXERCISE_UNITS,
      difficulties: DIFFICULTIES,
      tags: EXERCISE_TAGS,
    };

    // assert
    expect(vocabulary).toEqual(expected);
  });

  it("holds 19 muscles and 23 pieces of equipment", () => {
    // arrange
    const expected = { muscles: 19, equipment: 23 };

    // act
    const counts = { muscles: MUSCLES.length, equipment: EQUIPMENT.length };

    // assert
    expect(counts).toEqual(expected);
    expect(MUSCLES.slice(0, 3)).toEqual(["Chest", "Upper back", "Lats"]);
    expect(MUSCLES.at(-1)).toBe("Full body");
    expect(EQUIPMENT.slice(0, 3)).toEqual([
      "Barbell",
      "Dumbbells",
      "Kettlebell",
    ]);
    expect(EQUIPMENT.at(-1)).toBe("Jump rope");
  });

  it("limits the name to 80 characters and the form cues to 1,000", () => {
    // arrange
    const expected = [80, 1_000];

    // act
    const limits = [MAX_EXERCISE_NAME_LENGTH, MAX_FORM_CUES_LENGTH];

    // assert
    expect(limits).toEqual(expected);
  });

  it.each([
    ["resistance", ["reps", "time", "distance"]],
    ["cardio", ["time", "distance"]],
    ["mobility", ["time", "reps"]],
    ["stretching", ["time"]],
    ["breathing", ["breaths", "time"]],
  ] as const)("measures %s in %j", (type, units) => {
    // arrange
    const exerciseType = type;

    // act
    const allowed = unitsFor(exerciseType);

    // assert
    expect(allowed).toEqual(units);
  });

  it.each([
    ["resistance", "reps"],
    ["cardio", "time"],
    ["mobility", "time"],
    ["stretching", "time"],
    ["breathing", "breaths"],
  ] as const)("measures %s by default in %s", (type, unit) => {
    // arrange
    const exerciseType = type;

    // act
    const measured = defaultUnitFor(exerciseType);

    // assert
    expect(measured).toBe(unit);
  });
});
