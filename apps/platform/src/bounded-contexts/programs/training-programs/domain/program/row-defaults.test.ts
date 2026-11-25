import { describe, expect, it } from "vitest";

import type { Equipment, LibraryExercise } from "./library-exercise";
import type {
  Block,
  ExerciseRow,
  PlannedSet,
  Range,
  SetTargets,
} from "./program-content";
import {
  RowDefaults,
  type RowDefaultTargets,
  type WorkingTargets,
} from "./row-defaults";
import type { BlockType, Slot } from "./vocabulary";

type RirStart = Pick<WorkingTargets, "rir" | "lastSetRir">;
const LOADING_RIR: RirStart = { rir: 3, lastSetRir: 2 };

function idsFrom(prefix: string): () => string {
  let next = 0;

  return () => `${prefix}-${(next += 1)}`;
}

function rowDefaults(): RowDefaults {
  return new RowDefaults({ newId: idsFrom("defaulted") });
}

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

function start(
  count: number,
  reps: Range,
  rir: RirStart,
  weightKg?: number,
): WorkingTargets {
  return {
    count,
    reps: { ...reps },
    ...rir,
    ...(weightKg === undefined ? {} : { weightKg }),
  };
}

function targets(reps: Range, rir: number, weightKg?: number): SetTargets {
  return {
    reps: { ...reps },
    rir,
    ...(weightKg === undefined ? {} : { weightKg }),
  };
}

function times(count: number, set: SetTargets): SetTargets[] {
  return Array.from({ length: count }, () =>
    targets(set.reps, set.rir, set.weightKg),
  );
}

/** `count` working sets at RIR 3 and a last one at RIR 2, as a Hypertrophy or Strength block starts them. */
function loadingSets(
  count: number,
  reps: Range,
  weightKg?: number,
): SetTargets[] {
  return [
    ...times(count - 1, targets(reps, 3, weightKg)),
    targets(reps, 2, weightKg),
  ];
}

const WARM_UPS: SetTargets[] = [
  targets({ min: 8, max: 8 }, 3, 20),
  targets({ min: 5, max: 5 }, 3),
];

/** The warm-up sets `warm-up-1`… then the working sets `set-1`…, the last at `lastSetRir`. */
function startSets(
  { count, reps, rir, lastSetRir = rir, weightKg }: WorkingTargets,
  warmUps: readonly SetTargets[] = [],
): PlannedSet[] {
  return [
    ...warmUps.map((warmUp, index): PlannedSet => ({
      id: `warm-up-${index + 1}`,
      kind: "warm-up",
      start: targets(warmUp.reps, warmUp.rir, warmUp.weightKg),
    })),
    ...Array.from({ length: count }, (_, index): PlannedSet => ({
      id: `set-${index + 1}`,
      kind: "working",
      start: targets(reps, index === count - 1 ? lastSetRir : rir, weightKg),
    })),
  ];
}

const nextRowId = idsFrom("row");

function row(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id: nextRowId(),
    exerciseId: "exercise-1",
    slot: "A",
    startSets: startSets(start(3, { min: 8, max: 10 }, { rir: 2 })),
    restSeconds: 90,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
    ...overrides,
  };
}

function rowStarting(
  working: WorkingTargets,
  warmUps: readonly SetTargets[] = [],
): Partial<ExerciseRow> {
  return { startSets: startSets(working, warmUps) };
}

function startsOf(
  stored: ExerciseRow,
  kind: "warm-up" | "working" = "working",
): SetTargets[] {
  return stored.startSets
    .filter((set) => set.kind === kind)
    .map((set) => set.start);
}

function blockOf(rows: ExerciseRow[]): Block {
  return {
    id: "block-1",
    originId: "block-1",
    type: "hypertrophy",
    weeks: 4,
    trainingDays: 2,
    calibrationWeek: false,
    introText: "",
    clientNote: "",
    split: { shape: "full-body", name: "", text: "" },
    targetMinutes: 45,
    calendar: {
      mon: { kind: "rest" },
      tue: { kind: "rest" },
      wed: { kind: "rest" },
      thu: { kind: "rest" },
      fri: { kind: "rest" },
      sat: { kind: "rest" },
      sun: { kind: "rest" },
    },
    sessions: [
      {
        id: "session-1",
        originId: "session-1",
        name: "A",
        warmUp: { items: [] },
        coolDown: { enabled: false, items: [] },
        rows,
      },
    ],
    cardioSessions: [],
    dailySteps: 6000,
    missedDayNote: "",
  };
}

const TABLE: [BlockType, Slot, RowDefaultTargets][] = [
  [
    "foundation",
    "A",
    { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 },
  ],
  [
    "foundation",
    "B",
    { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 },
  ],
  [
    "foundation",
    "C",
    { start: start(3, { min: 12, max: 15 }, { rir: 3 }), restSeconds: 75 },
  ],
  [
    "hypertrophy",
    "A",
    { start: start(4, { min: 6, max: 10 }, LOADING_RIR), restSeconds: 150 },
  ],
  [
    "hypertrophy",
    "B",
    { start: start(3, { min: 8, max: 12 }, LOADING_RIR), restSeconds: 105 },
  ],
  [
    "hypertrophy",
    "C",
    { start: start(3, { min: 10, max: 20 }, LOADING_RIR), restSeconds: 75 },
  ],
  [
    "strength",
    "A",
    { start: start(4, { min: 3, max: 6 }, LOADING_RIR), restSeconds: 150 },
  ],
  [
    "strength",
    "B",
    { start: start(3, { min: 8, max: 12 }, LOADING_RIR), restSeconds: 105 },
  ],
  [
    "strength",
    "C",
    { start: start(3, { min: 10, max: 20 }, LOADING_RIR), restSeconds: 75 },
  ],
];

describe("RowDefaults forSlot", () => {
  it.each(TABLE)(
    "gives %s slot %s its table values",
    (type, slot, expected) => {
      // act
      const defaults = RowDefaults.forSlot(type, slot);

      // assert
      expect(defaults).toEqual(expected);
    },
  );

  it("gives a new main lift in a Deload block half the Hypertrophy sets at RIR 4", () => {
    // act
    const result = RowDefaults.forSlot("deload", "A");

    // assert
    expect(result).toEqual({
      start: start(2, { min: 6, max: 10 }, { rir: 4 }),
      restSeconds: 150,
    });
  });
});

describe("RowDefaults defaultSets", () => {
  it("gives a main lift its warm-up sets before the block's default working sets, each with its own id", () => {
    // act
    const sets = rowDefaults().defaultSets("hypertrophy", "A");

    // assert
    expect(
      sets.map((set) => [set.kind, set.start.reps.min, set.start.rir]),
    ).toEqual([
      ["warm-up", 8, 3],
      ["warm-up", 5, 3],
      ["working", 6, 3],
      ["working", 6, 3],
      ["working", 6, 3],
      ["working", 6, 2],
    ]);
    expect(new Set(sets.map((set) => set.id)).size).toBe(6);
  });
});

describe("RowDefaults defaultedRow", () => {
  it("refills what the working sets start from with the block's defaults", () => {
    // act
    const result = rowDefaults().defaultedRow(row(), "strength");

    // assert
    expect(startsOf(result)).toEqual(loadingSets(4, { min: 3, max: 6 }));
    expect(result.restSeconds).toBe(150);
  });

  it("keeps the warm-up sets and a weight the sets start from", () => {
    // act
    const result = rowDefaults().defaultedRow(
      row(rowStarting(start(2, { min: 8, max: 10 }, { rir: 2 }, 60), WARM_UPS)),
      "strength",
    );

    // assert
    expect(startsOf(result, "warm-up")).toEqual(WARM_UPS);
    expect(startsOf(result)).toEqual(loadingSets(4, { min: 3, max: 6 }, 60));
  });

  it("keeps a typed rest", () => {
    // act
    const result = rowDefaults().defaultedRow(
      row({ restSeconds: 45, touched: ["restSeconds"] }),
      "strength",
    );

    // assert
    expect(result.restSeconds).toBe(45);
  });

  it("picks the role from the slot", () => {
    // act
    const result = rowDefaults().defaultedRow(
      row({ slot: "C" }),
      "hypertrophy",
    );

    // assert
    expect(result.restSeconds).toBe(75);
  });
});

describe("RowDefaults deload weights", () => {
  it.each([
    [["Barbell"] as Equipment[], 60, 50],
    [["Barbell"] as Equipment[], 40, 35],
    [["Barbell"] as Equipment[], 20, 20],
    [["Dumbbells"] as Equipment[], 12, 10],
    [["Dumbbells"] as Equipment[], 5, 4],
    [["Dumbbells"] as Equipment[], 4, 4],
    [["Kettlebell"] as Equipment[], 8, 8],
  ])(
    "take 10 %% off in the steps of %j and round down, keeping the load when that cuts more than 20 %%: %s kg to %s kg",
    (equipment, weightKg, expected) => {
      // arrange
      const lift = exercise("lift", { equipment });
      const held = row({
        exerciseId: "lift",
        progression: { kind: "custom", text: "" },
        ...rowStarting(start(2, { min: 8, max: 8 }, { rir: 2 }, weightKg)),
      });

      // act
      const result = rowDefaults().deloadedBlock(blockOf([held]), {
        level: "intermediate",
        libraryExercises: [lift],
      });

      // assert
      expect(startsOf(result.sessions[0].rows[0])[0].weightKg).toBe(expected);
    },
  );
});

describe("RowDefaults deloadedBlock", () => {
  const squat = exercise("squat", {
    equipment: ["Barbell"],
    role: "main-compound",
  });

  it("sources the deload from the resolved sets of the last loading week, its warm-up sets included", () => {
    // arrange
    const warmUp = targets({ min: 5, max: 5 }, 3, 40);
    const source = {
      ...blockOf([
        row({
          exerciseId: "squat",
          ...rowStarting(start(4, { min: 6, max: 8 }, LOADING_RIR, 70), [
            warmUp,
          ]),
        }),
      ]),
      weeks: 6,
    };

    // act
    const result = rowDefaults().deloadedBlock(source, {
      level: "intermediate",
      libraryExercises: [squat],
    });

    // assert
    const [deloaded] = result.sessions[0].rows;
    expect(result.type).toBe("deload");
    expect(startsOf(deloaded, "warm-up")).toEqual([
      { ...warmUp, weightKg: 45 },
    ]);
    expect(startsOf(deloaded)).toEqual(
      times(2, targets({ min: 7, max: 8 }, 4, 65)),
    );
    expect(deloaded.touched).toEqual([]);
  });
});

describe("RowDefaults blockSwitchedToDeload", () => {
  const squat = exercise("squat", {
    equipment: ["Barbell"],
    role: "main-compound",
  });
  const curl = exercise("curl", {
    equipment: ["Dumbbells"],
    role: "isolation",
  });
  const loaded = (count: number, weightKg: number) =>
    rowStarting(start(count, { min: 6, max: 8 }, LOADING_RIR, weightKg));

  it("sources each row from the previous block's last loading week of the same exercise", () => {
    // arrange
    const previous = {
      ...blockOf([row({ exerciseId: "squat", ...loaded(4, 70) })]),
      weeks: 6,
    };
    const current = blockOf([row({ exerciseId: "squat", ...loaded(4, 60) })]);

    // act
    const result = rowDefaults().blockSwitchedToDeload(current, {
      previous,
      level: "intermediate",
      libraryExercises: [squat],
    });

    // assert
    expect(result).toMatchObject({ type: "deload", weeks: 1 });
    expect(startsOf(result.sessions[0].rows[0])).toEqual(
      times(2, targets({ min: 7, max: 8 }, 4, 65)),
    );
  });

  it("falls back to the row's own first week with its equipment step when no earlier block has the exercise", () => {
    // arrange
    const previous = {
      ...blockOf([row({ exerciseId: "squat", ...loaded(4, 70) })]),
      weeks: 6,
    };
    const current = blockOf([row({ exerciseId: "curl", ...loaded(3, 13) })]);

    // act
    const result = rowDefaults().blockSwitchedToDeload(current, {
      previous,
      level: "intermediate",
      libraryExercises: [squat, curl],
    });

    // assert
    expect(startsOf(result.sessions[0].rows[0])).toEqual(
      times(2, targets({ min: 6, max: 8 }, 4, 11)),
    );
  });
});

describe("RowDefaults reDefaultedBlock", () => {
  it("re-defaults every row and sets the type", () => {
    // act
    const result = rowDefaults().reDefaultedBlock(blockOf([row()]), "strength");

    // assert
    expect(result.type).toBe("strength");
    expect(result.sessions[0].rows[0].restSeconds).toBe(150);
  });
});
