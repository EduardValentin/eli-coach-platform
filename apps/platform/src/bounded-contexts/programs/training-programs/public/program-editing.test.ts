import { describe, expect, it } from "vitest";

import {
  BlockEditing,
  BlockLoss,
  BlockWeeks,
  PlanSequence,
  ProgramSuggestions,
  SessionTiming,
  type BlockSetup,
  type DayChoice,
  type LossChange,
  type ProposedBlock,
  type SequenceProblem,
} from "./program-editing";

const SETUP: BlockSetup = {
  splitShape: "full-body",
  trainingDays: 3,
  sessionMinutes: 45,
  dailySteps: 7000,
  language: "en",
};

function idsFrom(prefix: string): () => string {
  let next = 0;

  return () => `${prefix}-${(next += 1)}`;
}

describe("the builder's editing rules, as the browser reaches them", () => {
  it("reshapes a plan: adds the proposed block, makes a day cardio, re-lays the week, and names what a change would lose", () => {
    // arrange
    const suggestions = new ProgramSuggestions({
      cardioExercises: [],
      newId: idsFrom("suggested"),
    });
    const blockEditing = new BlockEditing({ newId: idsFrom("edited") });
    const first = suggestions.newBlock("hypertrophy", 6, { setup: SETUP });
    const cardioDay: DayChoice = { kind: "cardio" };
    const fewerDays: LossChange = { kind: "training-days", days: 2 };

    // act
    const proposal: ProposedBlock =
      ProgramSuggestions.proposedBlockAfter(first);
    const added = suggestions.newBlock(proposal.type, proposal.weeks, {
      setup: SETUP,
      previous: first,
    });
    const withCardioSunday = blockEditing.blockWithDay(first, "sun", cardioDay);
    const relaid = blockEditing.relayoutBlock(withCardioSunday, 2);
    const problems: SequenceProblem[] = PlanSequence.problemsOf([added, first]);

    // assert
    expect(added).toMatchObject({ type: "deload", weeks: 1 });
    expect(BlockWeeks.isAllowed(added.type, added.weeks)).toBe(true);
    expect(withCardioSunday.calendar.sun.kind).toBe("cardio");
    expect(relaid.trainingDays).toBe(2);
    expect(BlockLoss.describe(withCardioSunday, fewerDays)).toEqual([]);
    expect(problems.map((problem) => PlanSequence.messageOf(problem))).toEqual([
      "The plan cannot start with a Deload",
    ]);
    expect(
      SessionTiming.estimatedDuration(
        SessionTiming.routineMinutes(first.sessions[0]),
      ),
    ).toBe("0 min");
    expect(SessionTiming.cardioMinutes(first.cardioSessions[0])).toBe(30);
  });
});
