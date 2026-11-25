import { describe, expect, it } from "vitest";

import type {
  Block,
  CardioSession,
  ExerciseRow,
  ProgramContent,
  Session,
} from "./program-content";
import { ProgramExerciseIds } from "./program-exercise-ids";

function row(exerciseId: string, substitutions: string[] = []): ExerciseRow {
  return {
    id: `row-${exerciseId}`,
    exerciseId,
    slot: "C",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions,
    progression: { kind: "double" },
    cues: "",
    touched: [],
  };
}

function session(overrides: Partial<Session>): Session {
  return {
    id: "session",
    originId: "session",
    name: "Full Body A",
    warmUp: { items: [] },
    coolDown: { enabled: false, items: [] },
    rows: [],
    ...overrides,
  };
}

function cardio(exerciseIds: string[]): CardioSession {
  return {
    id: "cardio",
    originId: "cardio",
    name: "Easy cardio",
    segments: exerciseIds.map((exerciseId, index) => ({
      id: `segment-${index}`,
      kind: "steady",
      exerciseId,
      minutes: 30,
      intensity: "easy",
    })),
  };
}

function contentOf(blocks: Partial<Block>[]): ProgramContent {
  return {
    header: { title: "", focus: "", personalNote: "" },
    plan: {
      blocks: blocks.map(
        (block) => ({ sessions: [], cardioSessions: [], ...block }) as Block,
      ),
    },
    nutritionNotes: "",
    lifestyleNotes: "",
  };
}

describe("ProgramExerciseIds usedBy", () => {
  it("lists every exercise a row, a substitution, the warm-up, the cool-down while it is off and a cardio segment use", () => {
    // arrange
    const content = contentOf([
      {
        sessions: [
          session({
            warmUp: {
              items: [{ id: "w1", exerciseId: "hips", sets: 1, seconds: 45 }],
            },
            coolDown: {
              enabled: false,
              items: [{ id: "c1", exerciseId: "pigeon", seconds: 30 }],
            },
            rows: [row("squat", ["goblet-squat", "leg-press"])],
          }),
        ],
        cardioSessions: [cardio(["bike"])],
      },
    ]);

    // act
    const ids = ProgramExerciseIds.usedBy(content);

    // assert
    expect(ids).toEqual([
      "hips",
      "pigeon",
      "squat",
      "goblet-squat",
      "leg-press",
      "bike",
    ]);
  });

  it("lists an exercise once across blocks and leaves out unchosen ones", () => {
    // arrange
    const content = contentOf([
      { sessions: [session({ rows: [row("squat"), row("")] })] },
      {
        sessions: [session({ rows: [row("squat", ["lunge"])] })],
        cardioSessions: [cardio(["", "bike"])],
      },
    ]);

    // act
    const ids = ProgramExerciseIds.usedBy(content);

    // assert
    expect(ids).toEqual(["squat", "lunge", "bike"]);
  });
});
