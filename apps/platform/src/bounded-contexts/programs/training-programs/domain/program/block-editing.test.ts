import { describe, expect, it } from "vitest";

import { BlockEditing } from "./block-editing";
import type { LibraryExercise } from "./library-exercise";
import type {
  Block,
  CardioSession,
  ExerciseRow,
  PlannedSet,
  Session,
  SetTargets,
} from "./program-content";
import type { ProgramSetupValues } from "./program-setup";
import { ProgramSuggestions } from "./program-suggestions";

const SETUP: ProgramSetupValues = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: [],
};

function idsFrom(prefix: string): () => string {
  let next = 0;

  return () => `${prefix}-${(next += 1)}`;
}

function block(): Block {
  return new ProgramSuggestions({
    libraryExercises: [],
    newId: idsFrom("built"),
  }).newBlock("foundation", 4, { setup: SETUP });
}

function blockEditing(): BlockEditing {
  return new BlockEditing({ newId: idsFrom("edited") });
}

function row(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id: "row",
    exerciseId: "",
    slot: "A",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
    ...overrides,
  };
}

function filled(session: Session, exerciseCount: number): Session {
  const rows = Array.from({ length: exerciseCount }, (_, index) =>
    row({ id: `${session.id}-row-${index}`, exerciseId: `e${index}` }),
  );

  return { ...session, rows };
}

function filledBlock(...exerciseCounts: number[]): Block {
  const start = block();

  return {
    ...start,
    sessions: start.sessions.map((session, index) =>
      filled(session, exerciseCounts[index] ?? 0),
    ),
  };
}

function easyCardio(id: string): CardioSession {
  return {
    id,
    originId: id,
    name: "Easy cardio",
    segments: [
      {
        id: `${id}-segment`,
        kind: "steady",
        exerciseId: "",
        minutes: 30,
        intensity: "easy",
      },
    ],
  };
}

describe("BlockEditing blockWithDay", () => {
  it("adds an empty cardio day for a day that becomes cardio", () => {
    // arrange
    const start = block();

    // act
    const next = blockEditing().blockWithDay(start, "sat", { kind: "cardio" });

    // assert
    const added = next.cardioSessions.at(-1);
    expect(next.calendar.sat).toEqual({ kind: "cardio", cardioId: added?.id });
    expect(added).toEqual({
      id: added?.id,
      originId: added?.id,
      name: "Cardio",
      segments: [],
    });
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length + 1);
  });

  it("keeps the cardio session of a day that is already cardio", () => {
    // arrange
    const start = block();
    const current = start.calendar.tue;

    // act
    const next = blockEditing().blockWithDay(start, "tue", { kind: "cardio" });

    // assert
    expect(next.calendar.tue).toEqual(current);
    expect(next.cardioSessions).toEqual(start.cardioSessions);
  });

  it("removes the cardio session of a day that stops being cardio", () => {
    // arrange
    const start = block();
    expect(start.calendar.tue.kind).toBe("cardio");

    // act
    const next = blockEditing().blockWithDay(start, "tue", { kind: "rest" });

    // assert
    expect(next.calendar.tue).toEqual({ kind: "rest" });
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length - 1);
  });

  it("moves a session to another day and rests the day it left", () => {
    // arrange
    const start = block();
    const [first] = start.sessions;

    // act
    const next = blockEditing().blockWithDay(start, "sat", {
      kind: "session",
      sessionId: first.id,
    });

    // assert
    expect(next.calendar.sat).toEqual({ kind: "session", sessionId: first.id });
    expect(next.calendar.mon).toEqual({ kind: "rest" });
  });

  it("removes the strength session of a day that becomes a rest day, with every day it was on", () => {
    // arrange
    const start = block();
    const [first] = start.sessions;
    const twice: Block = {
      ...start,
      calendar: {
        ...start.calendar,
        sat: { kind: "session", sessionId: first.id },
      },
    };

    // act
    const next = blockEditing().blockWithDay(twice, "mon", { kind: "rest" });

    // assert
    expect(next.sessions.map((session) => session.id)).not.toContain(first.id);
    expect(next.sessions).toHaveLength(start.sessions.length - 1);
    expect(next.calendar.mon).toEqual({ kind: "rest" });
    expect(next.calendar.sat).toEqual({ kind: "rest" });
  });

  it("removes the strength session of a day that becomes cardio", () => {
    // arrange
    const start = block();
    const [first] = start.sessions;

    // act
    const next = blockEditing().blockWithDay(start, "mon", { kind: "cardio" });

    // assert
    const added = next.cardioSessions.at(-1);
    expect(next.sessions.map((session) => session.id)).not.toContain(first.id);
    expect(next.calendar.mon).toEqual({ kind: "cardio", cardioId: added?.id });
    expect(next.cardioSessions).toHaveLength(start.cardioSessions.length + 1);
  });

  it("keeps the strength session a day gives up for another session", () => {
    // arrange
    const start = block();
    const [first, second] = start.sessions;

    // act
    const next = blockEditing().blockWithDay(start, "mon", {
      kind: "session",
      sessionId: second.id,
    });

    // assert
    expect(next.sessions).toEqual(start.sessions);
    expect(next.calendar.mon).toEqual({
      kind: "session",
      sessionId: second.id,
    });
    expect(Object.values(next.calendar)).not.toContainEqual({
      kind: "session",
      sessionId: first.id,
    });
  });
});

describe("BlockEditing listedSessions", () => {
  it("lists the strength sessions by their weekday, then the ones not on the calendar", () => {
    // arrange
    const start = block();
    const [first, second, third] = start.sessions;
    const moved = blockEditing().blockWithDay(start, "mon", {
      kind: "session",
      sessionId: second.id,
    });

    // act
    const listed = BlockEditing.listedSessions(moved);

    // assert
    expect(listed.map((session) => session.id)).toEqual([
      second.id,
      third.id,
      first.id,
    ]);
  });
});

describe("BlockEditing relayoutBlock", () => {
  it("starts with as many training days as the block has sessions", () => {
    // act
    const start = block();

    // assert
    expect(start.trainingDays).toBe(3);
    expect(start.sessions).toHaveLength(3);
  });

  it("keeps the first sessions and adds empty ones from the split for more training days", () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const next = blockEditing().relayoutBlock(start, 5);

    // assert
    expect(next.trainingDays).toBe(5);
    expect(next.sessions.slice(0, 3)).toEqual(start.sessions);
    expect(
      next.sessions.slice(3).map((session) => [session.name, session.rows]),
    ).toEqual([
      ["Full Body D", []],
      ["Full Body E", []],
    ]);
    expect(
      (["mon", "tue", "wed", "fri", "sat"] as const).map(
        (day) => next.calendar[day],
      ),
    ).toEqual(
      next.sessions.map((session) => ({
        kind: "session",
        sessionId: session.id,
      })),
    );
  });

  it("drops the sessions past the new day count and keeps cardio on the days left free", () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const next = blockEditing().relayoutBlock(start, 2);

    // assert
    expect(next.sessions).toEqual(start.sessions.slice(0, 2));
    expect(next.calendar.mon).toEqual({
      kind: "session",
      sessionId: start.sessions[0].id,
    });
    expect(next.calendar.thu).toEqual({
      kind: "session",
      sessionId: start.sessions[1].id,
    });
    expect(next.cardioSessions).toEqual(start.cardioSessions);
    expect(next.calendar.tue).toEqual({
      kind: "cardio",
      cardioId: start.cardioSessions[0].id,
    });
  });

  it("drops the cardio sessions that no free day is left for", () => {
    // arrange
    const start: Block = {
      ...block(),
      cardioSessions: ["c1", "c2", "c3", "c4"].map(easyCardio),
    };

    // act
    const next = blockEditing().relayoutBlock(start, 5);

    // assert
    expect(next.cardioSessions).toEqual(start.cardioSessions.slice(0, 2));
    expect([next.calendar.thu, next.calendar.sun]).toEqual(
      start.cardioSessions
        .slice(0, 2)
        .map((cardio) => ({ kind: "cardio", cardioId: cardio.id })),
    );
  });
});

describe("BlockEditing blockWithSplit", () => {
  it("rebuilds empty sessions and the split text for the new shape, keeping the split name and cardio", () => {
    // arrange
    const filledStart = filledBlock(2, 2, 2);
    const start: Block = {
      ...filledStart,
      split: { ...filledStart.split, name: "My split" },
    };

    // act
    const next = blockEditing().blockWithSplit(start, "upper-lower", "en");

    // assert
    expect(next.split).toMatchObject({
      shape: "upper-lower",
      name: "My split",
    });
    expect(next.split.text).toMatch(/^\*\*Your split: Upper \/ Lower/);
    expect(next.sessions.map((session) => session.name)).toEqual([
      "Lower A",
      "Upper A",
      "Lower B",
    ]);
    expect(next.sessions.every((session) => session.rows.length === 0)).toBe(
      true,
    );
    expect(next.cardioSessions).toEqual(start.cardioSessions);
    expect(
      Object.values(next.calendar).filter((entry) => entry.kind === "session"),
    ).toHaveLength(3);
  });
});

const SQUAT: LibraryExercise = {
  id: "squat",
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  pattern: "squat",
  role: "main-compound",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  tags: [],
  cues: "",
  videoPath: null,
  archived: false,
};

function squatRow(weightKg: number): ExerciseRow {
  const startSets = [3, 3, 3, 2].map((rir, index): PlannedSet => ({
    id: `set-${index + 1}`,
    kind: "working",
    start: { reps: { min: 6, max: 8 }, rir, weightKg },
  }));

  return row({
    id: "row-1",
    exerciseId: "squat",
    startSets,
    restSeconds: 90,
  });
}

function hypertrophyBlock(rows: ExerciseRow[], weeks: number): Block {
  const start = block();
  const [first, ...others] = start.sessions;

  return {
    ...start,
    type: "hypertrophy",
    weeks,
    sessions: [{ ...first, rows }, ...others],
  };
}

function workingStartsOf(edited: Block): SetTargets[] {
  return edited.sessions[0].rows[0].startSets
    .filter((set) => set.kind === "working")
    .map((set) => set.start);
}

const NO_PREVIOUS = {
  previous: undefined,
  level: "intermediate",
  libraryExercises: [SQUAT],
} as const;

describe("BlockEditing blockWithType", () => {
  it("switches a block to a Deload one week long, keeping its days", () => {
    // arrange
    const start: Block = { ...block(), type: "hypertrophy", weeks: 4 };

    // act
    const result = blockEditing().blockWithType(start, "deload", NO_PREVIOUS);

    // assert
    expect(result).toEqual({ ...start, type: "deload", weeks: 1 });
  });

  it("changes a block to another type, keeping its weeks and its days", () => {
    // arrange
    const start: Block = { ...block(), type: "hypertrophy", weeks: 4 };

    // act
    const result = blockEditing().blockWithType(start, "strength", NO_PREVIOUS);

    // assert
    expect(result).toEqual({ ...start, type: "strength" });
  });

  it("switches a block to a Deload one week long, prefilled from the last loading week of the block before it", () => {
    // arrange
    const previous = hypertrophyBlock([squatRow(70)], 6);
    const start = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockEditing().blockWithType(start, "deload", {
      ...NO_PREVIOUS,
      previous,
    });

    // assert
    expect(result).toMatchObject({ type: "deload", weeks: 1 });
    expect(workingStartsOf(result)).toEqual([
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
      { reps: { min: 7, max: 8 }, rir: 4, weightKg: 65 },
    ]);
  });

  it("changes a block to another type with that type’s default rest, keeping its weeks and its days", () => {
    // arrange
    const start = hypertrophyBlock([squatRow(60)], 4);

    // act
    const result = blockEditing().blockWithType(start, "strength", NO_PREVIOUS);

    // assert
    expect(result).toMatchObject({
      type: "strength",
      weeks: 4,
      calendar: start.calendar,
    });
    expect(result.sessions[0].rows[0].restSeconds).toBe(150);
  });
});
