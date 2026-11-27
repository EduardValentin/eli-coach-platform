import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import type {
  Block,
  ExerciseRow,
  PlannedSet,
  Range,
  Session,
  SetTargets,
} from "./program-content";
import {
  ProgramProgression,
  type ProgressionContext,
  type ResolvedSet,
  type ResolvedWeek,
} from "./program-progression";
import type { ClientLevel } from "./vocabulary";

function exercise(
  id: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "resistance",
    unit: "reps",
    perSide: false,
    pattern: null,
    role: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const squat = exercise("squat", {
  equipment: ["Barbell", "Squat rack"],
  role: "main-compound",
  pattern: "squat",
});
const curl = exercise("curl", {
  equipment: ["Dumbbells"],
  role: "isolation",
  pattern: "isolation",
});
const plank = exercise("plank", {
  unit: "time",
  role: "isolation",
  pattern: "core",
});
const pushUp = exercise("pushUp", {
  role: "secondary-compound",
  pattern: "horizontal-push",
});
const sledPush = exercise("sled", { unit: "distance", equipment: ["Machine"] });

const WARM_UPS: SetTargets[] = [
  { reps: { min: 8, max: 8 }, rir: 3, weightKg: 20 },
  { reps: { min: 5, max: 5 }, rir: 3, weightKg: 40 },
];

type WorkingStart = {
  count: number;
  reps: Range;
  rir: number;
  lastSetRir?: number;
  weightKg?: number;
};

const LOADING_RIR = { rir: 3, lastSetRir: 2 };

/** The first week's sets: the warm-up sets `warm-up-1`… then `count` working sets `set-1`…, the last at `lastSetRir`. */
function startSets(
  { count, reps, rir, lastSetRir = rir, weightKg }: WorkingStart,
  warmUps: readonly SetTargets[] = [],
): PlannedSet[] {
  const weight = weightKg === undefined ? {} : { weightKg };

  return [
    ...warmUps.map((start, index): PlannedSet => ({
      id: `warm-up-${index + 1}`,
      kind: "warm-up",
      start: { ...start, reps: { ...start.reps } },
    })),
    ...Array.from({ length: count }, (_, index): PlannedSet => ({
      id: `set-${index + 1}`,
      kind: "working",
      start: {
        reps: { ...reps },
        rir: index === count - 1 ? lastSetRir : rir,
        ...weight,
      },
    })),
  ];
}

function row(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id: "r",
    exerciseId: "e",
    slot: "A",
    startSets: startSets({ count: 3, reps: { min: 8, max: 12 }, rir: 2 }),
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
    ...overrides,
  };
}

function session(rows: ExerciseRow[]): Session {
  return {
    id: "s",
    originId: "s",
    name: "s",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows,
  };
}

function squatRow(
  weightKg?: number,
  overrides: Partial<ExerciseRow> = {},
): ExerciseRow {
  return row({
    exerciseId: "squat",
    slot: "A",
    startSets: startSets({
      count: 4,
      reps: { min: 6, max: 8 },
      ...LOADING_RIR,
      weightKg,
    }),
    ...overrides,
  });
}

function curlRow(weightKg: number): ExerciseRow {
  return row({
    exerciseId: "curl",
    slot: "C",
    startSets: startSets({
      count: 3,
      reps: { min: 10, max: 15 },
      ...LOADING_RIR,
      weightKg,
    }),
  });
}

type ContextShape = {
  level: ClientLevel;
  exercise?: LibraryExercise;
  block?: Partial<Pick<Block, "type" | "weeks" | "calibrationWeek">>;
};

function context({
  level,
  exercise: chosen,
  block,
}: ContextShape): ProgressionContext {
  return {
    level,
    exercise: chosen,
    block: { type: "hypertrophy", weeks: 6, calibrationWeek: false, ...block },
  };
}

const intermediate = context({ level: "intermediate", exercise: squat });

function resolvedWeeks(
  stored: ExerciseRow,
  shape: ProgressionContext,
): ResolvedWeek[] {
  return Array.from({ length: shape.block.weeks }, (_, index) =>
    ProgramProgression.resolvedWeek(stored, index + 1, shape),
  );
}

function workingSetsOf(week: ResolvedWeek): ResolvedSet[] {
  return week.sets.filter((set) => set.kind === "working");
}

/** The note a week shows: the first one any of its sets carries. */
function noteOf(week: ResolvedWeek) {
  return week.sets.find((set) => set.note)?.note;
}

function setTable(
  weeks: ResolvedWeek[],
  index = 0,
): [number | undefined, number, number][] {
  return weeks.map((week) => {
    const set = workingSetsOf(week)[index];

    return [set.weightKg, set.reps.min, set.rir];
  });
}

function workingCounts(weeks: ResolvedWeek[]): number[] {
  return weeks.map((week) => workingSetsOf(week).length);
}

function hasDifferentWorkingSets(week: ResolvedWeek): boolean {
  const [first, ...others] = workingSetsOf(week);

  return others.some(
    (other) =>
      other.reps.min !== first.reps.min ||
      other.reps.max !== first.reps.max ||
      other.weightKg !== first.weightKg,
  );
}

function setsAtWeek(stored: ExerciseRow, week: number, shape: ContextShape) {
  const { block, level } = context(shape);
  const exercisesById = new Map(
    shape.exercise ? [[stored.exerciseId, shape.exercise]] : [],
  );
  const [read] = ProgramProgression.sessionAtWeek(session([stored]), week, {
    block: block as Block,
    level,
    exercisesById,
  }).rows;

  return read.sets;
}

describe("ProgramProgression worked examples (6-week Hypertrophy block)", () => {
  it.each([
    [
      "beginner",
      40,
      [
        [40, 6, 3],
        [40, 7, 3],
        [40, 8, 3],
        [40, 8, 3],
        [40, 8, 3],
        [45, 6, 3],
      ],
      [
        [40, 6, 2],
        [40, 7, 2],
        [40, 8, 2],
        [40, 8, 2],
        [40, 8, 2],
        [45, 6, 2],
      ],
    ],
    [
      "intermediate",
      70,
      [
        [70, 6, 3],
        [70, 6, 3],
        [70, 7, 3],
        [70, 8, 2],
        [75, 6, 2],
        [75, 7, 1],
      ],
      [
        [70, 6, 2],
        [70, 6, 2],
        [70, 7, 2],
        [70, 8, 2],
        [75, 6, 2],
        [75, 7, 1],
      ],
    ],
    [
      "advanced",
      100,
      [
        [100, 6, 3],
        [100, 6, 3],
        [100, 6, 3],
        [100, 8, 2],
        [100, 8, 2],
        [105, 7, 1],
      ],
      [
        [100, 6, 2],
        [100, 6, 2],
        [100, 6, 2],
        [100, 8, 2],
        [100, 8, 2],
        [105, 7, 1],
      ],
    ],
  ] as const)(
    "progresses a %s back squat from %s kg, every set at the first set’s reps and weight and its own RIR",
    (level, weightKg, firstSets, lastSet) => {
      // act
      const weeks = resolvedWeeks(
        squatRow(weightKg),
        context({ level, exercise: squat }),
      );

      // assert
      expect(setTable(weeks)).toEqual(firstSets);
      expect(setTable(weeks, 2)).toEqual(firstSets);
      expect(setTable(weeks, 3)).toEqual(lastSet);
      expect(workingCounts(weeks)).toEqual([4, 4, 4, 4, 4, 4]);
    },
  );

  it.each([
    [
      "beginner",
      6,
      [
        [6, 10, 3],
        [6, 11, 3],
        [6, 12, 3],
        [6, 13, 3],
        [6, 14, 3],
        [6, 15, 3],
      ],
      [
        [6, 10, 2],
        [6, 11, 2],
        [6, 12, 2],
        [6, 13, 2],
        [6, 14, 2],
        [6, 15, 2],
      ],
    ],
    [
      "intermediate",
      10,
      [
        [10, 10, 3],
        [10, 10, 3],
        [10, 11, 3],
        [10, 12, 2],
        [10, 13, 2],
        [10, 14, 1],
      ],
      [
        [10, 10, 2],
        [10, 10, 2],
        [10, 11, 2],
        [10, 12, 2],
        [10, 13, 2],
        [10, 14, 1],
      ],
    ],
    [
      "advanced",
      14,
      [
        [14, 10, 3],
        [14, 10, 3],
        [14, 10, 3],
        [14, 12, 2],
        [14, 12, 2],
        [14, 13, 1],
      ],
      [
        [14, 10, 2],
        [14, 10, 2],
        [14, 10, 2],
        [14, 12, 2],
        [14, 12, 2],
        [14, 13, 1],
      ],
    ],
  ] as const)(
    "progresses a %s dumbbell curl from %s kg, every set at the first set’s reps and weight and its own RIR",
    (level, weightKg, firstSets, lastSet) => {
      // act
      const weeks = resolvedWeeks(
        curlRow(weightKg),
        context({ level, exercise: curl }),
      );

      // assert
      expect(setTable(weeks)).toEqual(firstSets);
      expect(setTable(weeks, 2)).toEqual(lastSet);
    },
  );

  it("shows reps as the range from this week up to the top and one RIR per set", () => {
    // act
    const sets = workingSetsOf(
      ProgramProgression.resolvedWeek(squatRow(70), 6, intermediate),
    );

    // assert
    expect(sets[0].reps).toEqual({ min: 7, max: 8 });
    expect(sets.map((set) => set.rir)).toEqual([1, 1, 1, 1]);
  });

  it("holds the load at the top of the range with a note when the next barbell load is too heavy", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(40),
      context({ level: "beginner", exercise: squat }),
    );

    // assert
    expect(weeks.map(noteOf)).toEqual([
      undefined,
      undefined,
      undefined,
      "step-too-large",
      "step-too-large",
      undefined,
    ]);
    expect(workingSetsOf(weeks[3])[0].reps).toEqual({ min: 8, max: 8 });
  });
});

describe("ProgramProgression first week", () => {
  it("starts the first week from what the row's sets start from", () => {
    // act
    const [week] = resolvedWeeks(squatRow(70), intermediate);

    // assert
    expect(workingSetsOf(week)[0]).toEqual({
      setId: "set-1",
      kind: "working",
      reps: { min: 6, max: 8 },
      rir: 3,
      weightKg: 70,
    });
  });
});

describe("ProgramProgression RIR taper", () => {
  it("keeps RIR flat in a Foundation block", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(70),
      context({
        level: "advanced",
        exercise: squat,
        block: { type: "foundation" },
      }),
    );

    // assert
    expect(
      weeks.map((week) => workingSetsOf(week).map((set) => set.rir)),
    ).toEqual(weeks.map(() => [3, 3, 3, 2]));
  });

  it("tapers a Strength block toward RIR 2", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(70),
      context({
        level: "intermediate",
        exercise: squat,
        block: { type: "strength", weeks: 4 },
      }),
    );

    // assert
    expect(weeks.map((week) => workingSetsOf(week)[0].rir)).toEqual([
      3, 3, 3, 2,
    ]);
    expect(weeks.map((week) => workingSetsOf(week)[3].rir)).toEqual([
      2, 2, 2, 2,
    ]);
  });

  it("keeps RIR flat when the first week already sits at the floor", () => {
    // arrange
    const atFloor = row({
      exerciseId: "squat",
      startSets: startSets({
        count: 1,
        reps: { min: 6, max: 8 },
        rir: 1,
        weightKg: 70,
      }),
    });

    // act
    const weeks = resolvedWeeks(atFloor, intermediate);

    // assert
    expect(weeks.map((week) => workingSetsOf(week)[0].rir)).toEqual([
      1, 1, 1, 1, 1, 1,
    ]);
  });
});

describe("ProgramProgression short blocks", () => {
  it("returns the first week only for a one-week block", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(70),
      context({ level: "intermediate", exercise: squat, block: { weeks: 1 } }),
    );

    // assert
    expect(setTable(weeks)).toEqual([[70, 6, 3]]);
  });

  it("gives a two-week block one week of capacity gain and no RIR taper", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(100),
      context({ level: "beginner", exercise: squat, block: { weeks: 2 } }),
    );

    // assert
    expect(setTable(weeks)).toEqual([
      [100, 6, 3],
      [100, 7, 3],
    ]);
  });

  it("keeps RIR flat in a two-week block for an advanced client", () => {
    // act
    const weeks = resolvedWeeks(
      squatRow(100),
      context({ level: "advanced", exercise: squat, block: { weeks: 2 } }),
    );

    // assert
    expect(weeks.map((week) => workingSetsOf(week)[0].rir)).toEqual([3, 3]);
  });
});

describe("ProgramProgression without a load to step", () => {
  it("progresses reps and RIR when there is no starting weight", () => {
    // act
    const weeks = resolvedWeeks(squatRow(undefined), intermediate);

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 6, 3],
      [undefined, 6, 3],
      [undefined, 7, 3],
      [undefined, 8, 2],
      [undefined, 8, 2],
      [undefined, 8, 1],
    ]);
  });

  it("adds five seconds a week to a timed row, holds RIR and notes the hold at the top", () => {
    // arrange
    const timed = row({
      exerciseId: "plank",
      startSets: startSets({ count: 2, reps: { min: 30, max: 45 }, rir: 3 }),
    });

    // act
    const weeks = resolvedWeeks(
      timed,
      context({ level: "intermediate", exercise: plank }),
    );

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 30, 3],
      [undefined, 35, 3],
      [undefined, 40, 3],
      [undefined, 45, 3],
      [undefined, 45, 3],
      [undefined, 45, 3],
    ]);
    expect(weeks.map(noteOf)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      "progress-the-variation",
      "progress-the-variation",
    ]);
  });

  it("adds five seconds every second week for an advanced client", () => {
    // arrange
    const timed = row({
      exerciseId: "plank",
      startSets: startSets({ count: 1, reps: { min: 30, max: 60 }, rir: 3 }),
    });

    // act
    const weeks = resolvedWeeks(
      timed,
      context({ level: "advanced", exercise: plank }),
    );

    // assert
    expect(weeks.map((week) => workingSetsOf(week)[0].reps.min)).toEqual([
      30, 30, 35, 35, 40, 40,
    ]);
  });

  it("progresses only reps on a bodyweight row and asks for a harder variation at the top", () => {
    // arrange
    const bodyweight = row({
      exerciseId: "pushUp",
      slot: "B",
      startSets: startSets({ count: 3, reps: { min: 8, max: 12 }, rir: 3 }),
    });

    // act
    const weeks = resolvedWeeks(
      bodyweight,
      context({ level: "beginner", exercise: pushUp }),
    );

    // assert
    expect(weeks.map((week) => workingSetsOf(week)[0].reps.min)).toEqual([
      8, 9, 10, 11, 12, 12,
    ]);
    expect(noteOf(weeks[5])).toBe("harder-variation-or-add-load");
    expect(
      weeks.every((week) => workingSetsOf(week)[0].weightKg === undefined),
    ).toBe(true);
  });

  it.each([
    [
      "a custom progression rule",
      squatRow(70, {
        progression: { kind: "custom", text: "Add a rep when it feels easy" },
      }),
      squat,
      "hypertrophy",
    ],
    [
      "a distance row",
      row({
        exerciseId: "sled",
        startSets: startSets({
          count: 2,
          reps: { min: 20, max: 20 },
          rir: 3,
          weightKg: 70,
        }),
      }),
      sledPush,
      "hypertrophy",
    ],
    ["a Deload block", squatRow(70), squat, "deload"],
  ] as const)(
    "repeats the first week every week for %s",
    (_, held, chosen, type) => {
      // act
      const shape = {
        level: "intermediate",
        exercise: chosen,
        block: { type },
      } as const;
      const weeks = resolvedWeeks(held, context(shape));

      // assert
      const sets = weeks.map((week) => setsAtWeek(held, week.week, shape));
      expect(sets).toEqual(weeks.map(() => sets[0]));
      expect(weeks.every((week) => noteOf(week) === undefined)).toBe(true);
    },
  );
});

describe("ProgramProgression working sets of one kind", () => {
  it.each([
    ["intermediate", "hypertrophy"],
    ["advanced", "hypertrophy"],
    ["intermediate", "strength"],
    ["advanced", "strength"],
  ] as const)(
    "keeps a default %s %s exercise on one kind of set every week",
    (level, type) => {
      // act
      const weeks = resolvedWeeks(
        squatRow(70),
        context({ level, exercise: squat, block: { type } }),
      );

      // assert
      const rirs = (week: ResolvedWeek) =>
        workingSetsOf(week).map((set) => set.rir);
      expect(weeks.every((week) => !hasDifferentWorkingSets(week))).toBe(true);
      expect(weeks.every((week) => rirs(week)[3] <= rirs(week)[0])).toBe(true);
    },
  );

  it("carries the group’s progression note to every set of the group", () => {
    // act
    const week = ProgramProgression.resolvedWeek(
      squatRow(40),
      4,
      context({ level: "beginner", exercise: squat }),
    );

    // assert
    expect(workingSetsOf(week).map((set) => set.note)).toEqual([
      "step-too-large",
      "step-too-large",
      "step-too-large",
      "step-too-large",
    ]);
    expect(noteOf(week)).toBe("step-too-large");
  });
});

describe("ProgramProgression the sets of a week", () => {
  it("lists the warm-up sets before the working sets as the client reads them", () => {
    // arrange
    const warmedUp = squatRow(70, {
      startSets: startSets(
        { count: 2, reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
        WARM_UPS.slice(0, 1),
      ),
    });

    // act
    const sets = setsAtWeek(warmedUp, 2, {
      level: "intermediate",
      exercise: squat,
    });

    // assert
    expect(sets).toEqual([
      { kind: "warm-up", reps: { min: 8, max: 8 }, weightKg: 20 },
      { kind: "working", reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
      { kind: "working", reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
    ]);
  });

  it("reads working sets that differ only in RIR as the same kind of set", () => {
    // act
    const week = ProgramProgression.resolvedWeek(squatRow(70), 1, intermediate);

    // assert
    expect(workingSetsOf(week).map((set) => set.rir)).toEqual([3, 3, 3, 2]);
    expect(hasDifferentWorkingSets(week)).toBe(false);
  });
});

describe("ProgramProgression calibration week", () => {
  it("leaves the first week without a weight and progresses from the second week's weight", () => {
    // arrange
    const calibration = {
      level: "intermediate",
      exercise: squat,
      block: { calibrationWeek: true },
    } as const;
    const calibrating = squatRow(undefined, {
      startSets: startSets(
        { count: 4, reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
        WARM_UPS,
      ),
    });

    // act
    const weeks = resolvedWeeks(calibrating, context(calibration));

    // assert
    expect(setTable(weeks)).toEqual([
      [undefined, 6, 3],
      [70, 6, 3],
      [70, 6, 3],
      [70, 8, 2],
      [70, 8, 2],
      [75, 7, 1],
    ]);
    expect(setsAtWeek(calibrating, 1, calibration).slice(0, 2)).toEqual([
      { kind: "warm-up", reps: { min: 8, max: 8 } },
      { kind: "warm-up", reps: { min: 5, max: 5 } },
    ]);
  });
});

describe("ProgramProgression warm-up weights", () => {
  it("scales warm-up weights with the week’s heaviest working set, rounded to the step", () => {
    // arrange
    const warmedUp = squatRow(70, {
      startSets: startSets(
        { count: 2, reps: { min: 6, max: 8 }, rir: 3, weightKg: 70 },
        WARM_UPS,
      ),
    });

    // act
    const weeks = resolvedWeeks(warmedUp, intermediate);

    // assert
    expect(weeks[0].sets.slice(0, 2).map((set) => set.weightKg)).toEqual([
      20, 40,
    ]);
    expect(weeks[4].sets.slice(0, 2).map((set) => set.weightKg)).toEqual([
      20, 45,
    ]);
  });
});
