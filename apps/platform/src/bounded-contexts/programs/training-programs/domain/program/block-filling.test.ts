import { describe, expect, it } from "vitest";

import { BlockFilling } from "./block-filling";
import type { ExerciseRow } from "./program-content";
import { ProgramSuggestions } from "./program-suggestions";

function row(id: string, exerciseId: string): ExerciseRow {
  return {
    id,
    exerciseId,
    slot: "A",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions: [],
    progression: { kind: "double" },
    cues: "",
    touched: [],
  };
}

function fullBodyBlock() {
  let id = 0;

  return new ProgramSuggestions({
    libraryExercises: [],
    newId: () => `id-${(id += 1)}`,
  }).newBlock("foundation", 4, {
    setup: {
      splitShape: "full-body",
      trainingDays: 3,
      sessionMinutes: 60,
      dailySteps: 6000,
      language: "en",
      level: "beginner",
    },
  });
}

describe("BlockFilling", () => {
  it("counts the sessions that hold at least one exercise", () => {
    // arrange
    const block = fullBodyBlock();
    const [first, second, third] = block.sessions;
    const filled = {
      ...block,
      sessions: [
        { ...first, rows: [row("row-1", "squat")] },
        { ...second, rows: [row("row-2", "")] },
        third,
      ],
    };

    // act
    const count = BlockFilling.filledSessionCount(filled);

    // assert
    expect(count).toBe(1);
  });
});
