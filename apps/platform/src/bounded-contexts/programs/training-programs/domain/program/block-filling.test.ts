import { describe, expect, it } from "vitest";

import { BlockFilling } from "./block-filling";
import { ProgramSuggestions } from "./program-suggestions";

function fullBodyBlock() {
  let id = 0;

  return new ProgramSuggestions({
    cardioExercises: [],
    newId: () => `id-${(id += 1)}`,
  }).newBlock("foundation", 4, {
    setup: {
      splitShape: "full-body",
      trainingDays: 3,
      sessionMinutes: 60,
      dailySteps: 6000,
      language: "en",
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
        { ...first, rows: [{ id: "row-1", exerciseId: "squat" }] },
        { ...second, rows: [{ id: "row-2", exerciseId: "" }] },
        third,
      ],
    };

    // act
    const count = BlockFilling.filledSessionCount(filled);

    // assert
    expect(count).toBe(1);
  });
});
