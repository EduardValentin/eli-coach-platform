import { describe, expect, it } from "vitest";

import type {
  LibraryExercise,
  Session,
  WeekRow,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import {
  coolDownExerciseDetail,
  rowExerciseDetail,
  warmUpExerciseDetail,
} from "./session-exercise-details";

function exercise(overrides: Partial<LibraryExercise> = {}): LibraryExercise {
  return {
    id: "squat",
    name: "Squat",
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: "squat",
    role: "main-compound",
    primaryMuscles: ["Quadriceps"],
    secondaryMuscles: [],
    equipment: ["Barbell"],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const lunge = exercise({ id: "lunge", name: "Lunge", perSide: true });
const archivedPress = exercise({
  id: "press",
  name: "Press",
  archived: true,
});

const WEEK_ROW: WeekRow = {
  id: "row-1",
  exerciseId: "squat",
  slot: "A",
  restSeconds: 90,
  lastSetTechnique: "none",
  substitutions: ["lunge", "press", "gone"],
  progression: { kind: "double" },
  cues: "Brace",
  touched: [],
  sets: [{ kind: "working", reps: { min: 6, max: 8 }, rir: 2 }],
};

const SESSION = { rows: [WEEK_ROW] } as unknown as Session;

function findExercise(id: string) {
  return [exercise(), lunge, archivedPress].find((item) => item.id === id);
}

describe("warm-up details", () => {
  it("reads sets of reps and sets of seconds, per side where the exercise is", () => {
    // arrange
    const counted = {
      id: "w1",
      exerciseId: "lunge",
      sets: 2,
      reps: { min: 8, max: 10 },
    };
    const timed = { id: "w2", exerciseId: "squat", sets: 1, seconds: 45 };

    // act
    const repsDetail = warmUpExerciseDetail(counted, lunge);
    const timedDetail = warmUpExerciseDetail(timed, exercise());

    // assert
    expect(repsDetail?.targets).toEqual([
      { term: "Warm-up", value: "2 sets × 8–10 per side" },
    ]);
    expect(timedDetail?.targets).toEqual([
      { term: "Warm-up", value: "1 set × 45 s" },
    ]);
  });

  it("opens no detail for an exercise that is gone or archived", () => {
    // arrange
    const item = { id: "w1", exerciseId: "press", sets: 1, seconds: 45 };

    // act
    const archived = warmUpExerciseDetail(item, archivedPress);
    const missing = warmUpExerciseDetail(item, undefined);

    // assert
    expect([archived, missing]).toEqual([null, null]);
  });
});

describe("cool-down details", () => {
  it("reads the hold in seconds, per side where the exercise is", () => {
    // arrange
    const item = { id: "c1", exerciseId: "lunge", seconds: 30 };

    // act
    const detail = coolDownExerciseDetail(item, lunge);

    // assert
    expect(detail?.targets).toEqual([{ term: "Hold", value: "30 s per side" }]);
  });
});

describe("row details", () => {
  it("carries the first week's targets, cues, progression and the swaps still in the library", () => {
    // arrange
    const input = {
      session: SESSION,
      row: WEEK_ROW,
      progression: "Add a rep each week",
      findExercise,
    };

    // act
    const detail = rowExerciseDetail(input);

    // assert
    expect(detail?.cues).toBe("Brace");
    expect(detail?.progression).toBe("Add a rep each week");
    expect(detail?.swaps.map((swap) => swap.id)).toEqual(["lunge"]);
    expect(detail?.swapContext).toBe("Swap for A · Squat");
    expect(detail?.targets.map((target) => target.term)).toEqual([
      "Working",
      "RIR",
      "Rest",
    ]);
  });
});
