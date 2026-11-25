import { describe, expect, it } from "vitest";

import type {
  LibraryExercise,
  SetSpec,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import {
  counted,
  exerciseNameOf,
  formatRange,
  formatRest,
  musclesAndEquipmentText,
  nonEmptyLines,
  repsSuffix,
  repsUnit,
  rirSpan,
  setsBreakdown,
} from "./program-view";

const squat: LibraryExercise = {
  id: "squat",
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  pattern: "squat",
  role: "main-compound",
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell", "Squat rack"],
  tags: [],
  cues: "",
  videoPath: null,
  archived: false,
};

function workingSet(
  reps: [number, number],
  rir: number,
  weightKg?: number,
): SetSpec {
  return {
    kind: "working",
    reps: { min: reps[0], max: reps[1] },
    rir,
    ...(weightKg === undefined ? {} : { weightKg }),
  };
}

describe("counted", () => {
  it("pluralises every count but one", () => {
    // arrange
    const counts = [0, 1, 2];

    // act
    const texts = counts.map((count) => counted(count, "set"));

    // assert
    expect(texts).toEqual(["0 sets", "1 set", "2 sets"]);
  });
});

describe("formatRange", () => {
  it("shows one number when both ends agree and an en dash range otherwise", () => {
    // arrange
    const single = { min: 8, max: 8 };
    const range = { min: 6, max: 10 };

    // act
    const texts = [formatRange(single), formatRange(range)];

    // assert
    expect(texts).toEqual(["8", "6–10"]);
  });
});

describe("formatRest", () => {
  it("reads under a minute as seconds and longer as minutes and seconds", () => {
    // arrange
    const seconds = [45, 60, 75, 180];

    // act
    const texts = seconds.map(formatRest);

    // assert
    expect(texts).toEqual(["45 s", "1:00", "1:15", "3:00"]);
  });
});

describe("rirSpan", () => {
  it("spans the lowest to the highest RIR", () => {
    // arrange
    const rirs = [2, 3, 1];

    // act
    const span = rirSpan(rirs);

    // assert
    expect(span).toEqual({ min: 1, max: 3 });
  });
});

describe("setsBreakdown", () => {
  it("reads sets that differ only in RIR as one kind of set, with the lowest to highest RIR", () => {
    // arrange
    const warmUp: SetSpec = { kind: "warm-up", reps: { min: 8, max: 8 } };
    const sets = [
      warmUp,
      workingSet([6, 10], 2),
      workingSet([6, 10], 2),
      workingSet([6, 10], 1),
    ];

    // act
    const breakdown = setsBreakdown(sets, " s");

    // assert
    expect(breakdown).toEqual({
      warmUp: 1,
      working: 3,
      reps: "6–10 s",
      rir: { min: 1, max: 2 },
    });
  });

  it("gives no reps for working sets that differ in reps or in weight", () => {
    // arrange
    const byReps = [workingSet([5, 5], 2), workingSet([8, 10], 2)];
    const byWeight = [workingSet([8, 10], 2, 60), workingSet([8, 10], 2, 50)];

    // act
    const breakdowns = [setsBreakdown(byReps), setsBreakdown(byWeight)];

    // assert
    expect(breakdowns.map((breakdown) => breakdown.reps)).toEqual([null, null]);
  });

  it("has no RIR when there are no working sets", () => {
    // arrange
    const sets: SetSpec[] = [{ kind: "warm-up", reps: { min: 8, max: 8 } }];

    // act
    const breakdown = setsBreakdown(sets);

    // assert
    expect(breakdown).toEqual({ warmUp: 1, working: 0, reps: null, rir: null });
  });
});

describe("exercise wording", () => {
  it("names an exercise the library no longer has", () => {
    // arrange
    // act
    const names = [exerciseNameOf(squat), exerciseNameOf(undefined)];

    // assert
    expect(names).toEqual(["Back squat", "Exercise removed"]);
  });

  it("lists the primary muscles and the equipment", () => {
    // arrange
    const bare = { ...squat, equipment: [] };

    // act
    const texts = [
      musclesAndEquipmentText(squat),
      musclesAndEquipmentText(bare),
      musclesAndEquipmentText(undefined),
    ];

    // assert
    expect(texts).toEqual([
      "Quadriceps, Glutes · Barbell, Squat rack",
      "Quadriceps, Glutes",
      "",
    ]);
  });

  it("sets the unit after a number, per side when the exercise is", () => {
    // arrange
    const lunge = { ...squat, perSide: true };
    const plank = { ...squat, unit: "time" as const };

    // act
    const suffixes = [squat, lunge, plank].map(repsSuffix);

    // assert
    expect(suffixes).toEqual(["", " per side", " s"]);
    expect(repsUnit(plank, "column")).toBe("Seconds");
  });
});

describe("nonEmptyLines", () => {
  it("drops blank lines", () => {
    // arrange
    const text = "Brace\n\n  \nBreathe out";

    // act
    const lines = nonEmptyLines(text);

    // assert
    expect(lines).toEqual(["Brace", "Breathe out"]);
  });
});
