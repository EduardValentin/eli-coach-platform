import { describe, expect, it } from "vitest";

import type { Equipment, LibraryExercise } from "./library-exercise";
import { Substitutions } from "./substitutions";

function equippedExercise(
  id: string,
  equipment: Equipment[],
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: "horizontal-push",
    role: null,
    primaryMuscles: ["Chest"],
    secondaryMuscles: [],
    equipment,
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

describe("Substitutions suggestedFor", () => {
  const target = equippedExercise("bench", ["Barbell", "Bench"]);

  it("picks a lighter and a heavier match within the client equipment", () => {
    // arrange
    const library = [
      target,
      equippedExercise("machine-press", ["Machine"]),
      equippedExercise("db-press", ["Dumbbells"]),
      equippedExercise("pushup", []),
      equippedExercise("row", [], { pattern: "horizontal-pull" }),
      equippedExercise("archived", [], { archived: true }),
      equippedExercise("other-muscle", [], { primaryMuscles: ["Triceps"] }),
    ];

    // act
    const ids = Substitutions.suggestedFor(target, library, [
      "Dumbbells",
      "Machine",
    ]);

    // assert
    expect(ids).toEqual(["db-press", "machine-press"]);
  });

  it("falls back to equipment the client lacks", () => {
    // arrange
    const library = [
      target,
      equippedExercise("cable-fly", ["Cable"]),
      equippedExercise("db-press", ["Dumbbells"]),
    ];

    // act
    const ids = Substitutions.suggestedFor(target, library, ["Dumbbells"]);

    // assert
    expect(ids).toEqual(["db-press", "cable-fly"]);
  });

  it("returns nothing without a matching exercise", () => {
    // act
    const ids = Substitutions.suggestedFor(target, [target], []);

    // assert
    expect(ids).toEqual([]);
  });
});
