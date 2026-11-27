import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import type {
  Block,
  CardioSession,
  ExerciseRow,
  PlannedSet,
  Session,
} from "./program-content";
import { ProgramProgression, type WeekSession } from "./program-progression";
import { SessionTiming } from "./session-timing";

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

const squat = exercise("squat");
const plank = exercise("plank", { unit: "time" });
const sidePlank = exercise("side-plank", { unit: "time", perSide: true });
const hipSwitch = exercise("hip-switch", { perSide: true });
const pigeon = exercise("pigeon", { type: "stretching", perSide: true });
const childPose = exercise("child-pose", { type: "stretching" });
const exercisesById = new Map<string, LibraryExercise>(
  [squat, plank, sidePlank, hipSwitch, pigeon, childPose].map((item) => [
    item.id,
    item,
  ]),
);

function workingSets(
  count: number,
  reps: { min: number; max: number },
): PlannedSet[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `set-${index + 1}`,
    kind: "working",
    start: { reps: { ...reps }, rir: 2 },
  }));
}

function heldSets(count: number, seconds: number): PlannedSet[] {
  return workingSets(count, { min: seconds, max: seconds });
}

function row(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id: "r",
    exerciseId: "e",
    slot: "A",
    startSets: workingSets(3, { min: 8, max: 12 }),
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
    ...overrides,
  };
}

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "s",
    originId: "s",
    name: "s",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
    ...overrides,
  };
}

function blockOf(weeks: number, targetMinutes = 60): Block {
  return {
    type: "hypertrophy",
    weeks,
    calibrationWeek: false,
    targetMinutes,
  } as Block;
}

function firstWeek(stored: Session): WeekSession {
  return ProgramProgression.sessionAtWeek(stored, 1, {
    block: blockOf(1),
    level: "intermediate",
    exercisesById,
  });
}

const twoSquats = [
  row({ id: "1", exerciseId: "squat", restSeconds: 90 }),
  row({ id: "2", exerciseId: "squat", slot: "B", restSeconds: 90 }),
];

describe("SessionTiming estimatedMinutes", () => {
  it("estimates an empty session at zero minutes", () => {
    // act
    const minutes = SessionTiming.estimatedMinutes(
      firstWeek(session()),
      exercisesById,
    );

    // assert
    expect(minutes).toBe(0);
  });

  it("times reps at four seconds each, with the setup and the rest between working sets", () => {
    // arrange
    const reps = session({
      rows: [row({ exerciseId: "squat", restSeconds: 60 })],
    });

    // act
    const minutes = SessionTiming.estimatedMinutes(
      firstWeek(reps),
      exercisesById,
    );

    // assert
    expect(minutes).toBe(5);
  });

  it("adds a short rest after every warm-up set", () => {
    // arrange
    const withWarmUpSet = session({
      rows: [
        row({
          exerciseId: "squat",
          startSets: [
            {
              id: "warm-up-1",
              kind: "warm-up",
              start: { reps: { min: 5, max: 5 }, rir: 3 },
            },
            ...workingSets(3, { min: 8, max: 12 }),
          ],
          restSeconds: 60,
        }),
      ],
    });

    // act
    const minutes = SessionTiming.estimatedMinutes(
      firstWeek(withWarmUpSet),
      exercisesById,
    );

    // assert
    expect(minutes).toBe(6);
  });

  it("times held exercises by their prescribed seconds, twice for each side", () => {
    // arrange
    const held = session({
      rows: [
        row({
          exerciseId: "plank",
          startSets: heldSets(3, 20),
          restSeconds: 60,
        }),
      ],
    });
    const heldPerSide = session({
      rows: [
        row({
          exerciseId: "side-plank",
          startSets: heldSets(3, 20),
          restSeconds: 60,
        }),
      ],
    });

    // act
    const minutes = [
      SessionTiming.estimatedMinutes(firstWeek(held), exercisesById),
      SessionTiming.estimatedMinutes(firstWeek(heldPerSide), exercisesById),
    ];

    // assert
    expect(minutes).toEqual([4, 5]);
  });

  it("rests once per superset round instead of after every exercise", () => {
    // arrange
    const separate = session({ rows: twoSquats });
    const superset = session({
      rows: twoSquats.map((other) => ({
        ...other,
        slot: "C" as const,
        supersetGroup: "g",
      })),
    });

    // act
    const minutes = [
      SessionTiming.estimatedMinutes(firstWeek(separate), exercisesById),
      SessionTiming.estimatedMinutes(firstWeek(superset), exercisesById),
    ];

    // assert
    expect(minutes).toEqual([12, 9]);
  });

  it("adds the warm-up items and, while it is on, the cool-down stretches by their own amounts", () => {
    // arrange
    const mixed = session({
      warmUp: {
        items: [
          {
            id: "w1",
            exerciseId: "hip-switch",
            sets: 2,
            reps: { min: 5, max: 5 },
          },
          { id: "w2", exerciseId: "plank", sets: 1, seconds: 30 },
        ],
      },
      rows: [
        row({ id: "1", exerciseId: "squat", restSeconds: 60 }),
        row({
          id: "2",
          exerciseId: "plank",
          slot: "D",
          startSets: heldSets(3, 20),
          restSeconds: 60,
        }),
      ],
      coolDown: {
        enabled: true,
        items: [
          { id: "c1", exerciseId: "child-pose", seconds: 30 },
          { id: "c2", exerciseId: "pigeon", seconds: 30 },
        ],
      },
    });

    // act
    const withCoolDown = SessionTiming.estimatedMinutes(
      firstWeek(mixed),
      exercisesById,
    );
    const withoutCoolDown = SessionTiming.estimatedMinutes(
      firstWeek({ ...mixed, coolDown: { ...mixed.coolDown, enabled: false } }),
      exercisesById,
    );

    // assert
    expect(withCoolDown).toBe(13);
    expect(withoutCoolDown).toBe(11);
  });
});

describe("SessionTiming estimatedDuration", () => {
  it("marks an estimate as approximate but states zero plainly", () => {
    // act
    const texts = [
      SessionTiming.estimatedDuration(0),
      SessionTiming.estimatedDuration(13),
    ];

    // assert
    expect(texts).toEqual(["0 min", "~13 min"]);
  });
});

describe("SessionTiming longestWeekMinutes", () => {
  it("times a session by its longest week", () => {
    // arrange
    const lengthening = session({
      rows: [
        row({
          exerciseId: "plank",
          startSets: workingSets(10, { min: 30, max: 60 }),
          restSeconds: 60,
        }),
      ],
    });
    const timing = {
      block: blockOf(6),
      level: "intermediate" as const,
      exercisesById,
    };

    // act
    const minutes = SessionTiming.longestWeekMinutes(lengthening, timing);

    // assert
    expect(
      SessionTiming.estimatedMinutes(firstWeek(lengthening), exercisesById),
    ).toBe(18);
    expect(minutes).toBe(20);
  });
});

describe("SessionTiming isOverTarget", () => {
  it("flags a session only once it runs more than ten minutes over the block target", () => {
    // arrange
    const twelveMinutes = session({ rows: twoSquats });
    const withTarget = (targetMinutes: number) => ({
      block: blockOf(1, targetMinutes),
      level: "intermediate" as const,
      exercisesById,
    });

    // act
    const atTolerance = SessionTiming.isOverTarget(
      twelveMinutes,
      withTarget(2),
    );
    const beyondTolerance = SessionTiming.isOverTarget(
      twelveMinutes,
      withTarget(1),
    );

    // assert
    expect(atTolerance).toBe(false);
    expect(beyondTolerance).toBe(true);
  });
});

describe("SessionTiming cardioMinutes", () => {
  it("adds up the minutes of a cardio day's segments", () => {
    // arrange
    const cardio: CardioSession = {
      id: "cardio",
      originId: "cardio",
      name: "Easy cardio",
      segments: [
        {
          id: "s1",
          kind: "steady",
          exerciseId: "bike",
          minutes: 25,
          intensity: "easy",
        },
        {
          id: "s2",
          kind: "steady",
          exerciseId: "bike",
          minutes: 5,
          intensity: "moderate",
        },
      ],
    };

    // act
    const minutes = SessionTiming.cardioMinutes(cardio);

    // assert
    expect(minutes).toBe(30);
  });

  it("times an empty cardio day at zero minutes", () => {
    // act
    const minutes = SessionTiming.cardioMinutes({
      id: "cardio",
      originId: "cardio",
      name: "Cardio",
      segments: [],
    });

    // assert
    expect(minutes).toBe(0);
  });
});
