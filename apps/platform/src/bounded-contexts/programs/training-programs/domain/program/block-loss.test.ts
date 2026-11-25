import { describe, expect, it } from "vitest";

import { BlockLoss } from "./block-loss";
import type { Block, CardioSession, Session } from "./program-content";
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

function block(): Block {
  let next = 0;

  return new ProgramSuggestions({
    cardioExercises: [],
    newId: () => `id-${(next += 1)}`,
  }).newBlock("foundation", 4, { setup: SETUP });
}

function filled(session: Session, exerciseCount: number): Session {
  const rows = Array.from({ length: exerciseCount }, (_, index) => ({
    id: `${session.id}-row-${index}`,
    exerciseId: `e${index}`,
  }));

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

function cardio(id: string, name: string, segmentCount: number): CardioSession {
  return {
    id,
    originId: id,
    name,
    segments: Array.from({ length: segmentCount }, (_, index) => ({
      id: `${id}-segment-${index}`,
      kind: "steady" as const,
      exerciseId: "",
      minutes: 10,
      intensity: "hard" as const,
    })),
  };
}

describe("BlockLoss describe", () => {
  it("names every session with exercises when the split changes or resets", () => {
    // arrange
    const start = filledBlock(5, 1, 0);

    // act
    const split = BlockLoss.describe(start, { kind: "split" });
    const reset = BlockLoss.describe(start, { kind: "reset" });

    // assert
    expect(split).toEqual([
      "Full Body A · 5 exercises",
      "Full Body B · 1 exercise",
    ]);
    expect(reset).toEqual(split);
  });

  it("names the sessions and cardio that fewer or more training days drop", () => {
    // arrange
    const start: Block = {
      ...filledBlock(5, 4, 3),
      cardioSessions: [
        cardio("c1", "Easy cardio", 1),
        cardio("c2", "Easy cardio", 1),
        cardio("c3", "Easy cardio", 1),
        cardio("c4", "Intervals", 3),
      ],
    };

    // act
    const fewer = BlockLoss.describe(start, {
      kind: "training-days",
      days: 2,
    });
    const more = BlockLoss.describe(start, { kind: "training-days", days: 5 });

    // assert
    expect(fewer).toEqual(["Full Body C · 3 exercises"]);
    expect(more).toEqual(["Easy cardio · 1 segment", "Intervals · 3 segments"]);
  });

  it("names the session a day loses when its kind changes", () => {
    // arrange
    const start = filledBlock(5, 4, 3);

    // act
    const cardioDay = BlockLoss.describe(start, {
      kind: "day",
      weekday: "tue",
    });
    const sessionDay = BlockLoss.describe(start, {
      kind: "day",
      weekday: "mon",
    });
    const restDay = BlockLoss.describe(start, { kind: "day", weekday: "sun" });

    // assert
    expect(cardioDay).toEqual(["Easy cardio · 1 segment"]);
    expect(sessionDay).toEqual(["Full Body A · 5 exercises"]);
    expect(restDay).toEqual([]);
  });

  it("finds nothing to lose on a day whose strength session has no exercises", () => {
    // act
    const lost = BlockLoss.describe(block(), { kind: "day", weekday: "mon" });

    // assert
    expect(lost).toEqual([]);
  });

  it("names every session and cardio with content when the block is removed", () => {
    // arrange
    const start = filledBlock(5, 0, 2);

    // act
    const lost = BlockLoss.describe(start, { kind: "remove-block" });

    // assert
    expect(lost).toEqual([
      "Full Body A · 5 exercises",
      "Full Body C · 2 exercises",
      "Easy cardio · 1 segment",
      "Easy cardio · 1 segment",
    ]);
  });

  it("finds nothing to lose in empty sessions", () => {
    // act
    const lost = BlockLoss.describe(block(), { kind: "split" });

    // assert
    expect(lost).toEqual([]);
  });
});
