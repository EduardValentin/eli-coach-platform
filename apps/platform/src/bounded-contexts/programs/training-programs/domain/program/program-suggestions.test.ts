import { describe, expect, it } from "vitest";

import type { CardioExercise } from "./cardio-exercises-port";
import type { Block } from "./program-content";
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
  equipment: ["Dumbbells"],
};

const BIKE: CardioExercise = { id: "bike", name: "Stationary bike" };

function suggestionsOver(cardioExercises: CardioExercise[]) {
  let next = 0;

  return new ProgramSuggestions({
    cardioExercises,
    newId: () => `id-${(next += 1)}`,
  });
}

function calendarIds(block: Block, kind: "session" | "cardio"): string[] {
  return Object.values(block.calendar).flatMap((entry) => {
    if (entry.kind === "session" && kind === "session")
      return [entry.sessionId];
    if (entry.kind === "cardio" && kind === "cardio") return [entry.cardioId];
    return [];
  });
}

describe("ProgramSuggestions", () => {
  it("suggests blocks per level", () => {
    // arrange
    const suggestions = suggestionsOver([]);

    // act
    const plans = (["beginner", "intermediate", "advanced"] as const).map(
      (level) =>
        suggestions
          .initialContent({ ...SETUP, level })
          .plan.blocks.map(({ type, weeks, calibrationWeek }) => ({
            type,
            weeks,
            calibrationWeek,
          })),
    );

    // assert
    expect(plans).toEqual([
      [
        { type: "foundation", weeks: 4, calibrationWeek: false },
        { type: "hypertrophy", weeks: 6, calibrationWeek: false },
        { type: "deload", weeks: 1, calibrationWeek: false },
      ],
      [
        { type: "hypertrophy", weeks: 6, calibrationWeek: true },
        { type: "deload", weeks: 1, calibrationWeek: false },
        { type: "hypertrophy", weeks: 6, calibrationWeek: false },
      ],
      [
        { type: "hypertrophy", weeks: 5, calibrationWeek: true },
        { type: "deload", weeks: 1, calibrationWeek: false },
        { type: "strength", weeks: 4, calibrationWeek: false },
        { type: "deload", weeks: 1, calibrationWeek: false },
      ],
    ]);
  });

  it("builds a beginner plan of three blocks with empty Full Body sessions", () => {
    // act
    const content = suggestionsOver([]).initialContent(SETUP);

    // assert
    expect(content.header).toEqual({ title: "", focus: "", personalNote: "" });
    expect(content.nutritionNotes).toBe("");
    expect(content.lifestyleNotes).toBe("");
    expect(content.plan.blocks.map((block) => block.type)).toEqual([
      "foundation",
      "hypertrophy",
      "deload",
    ]);
    expect(content.plan.blocks[0].sessions.map((s) => s.name)).toEqual([
      "Full Body A",
      "Full Body B",
      "Full Body C",
    ]);
    expect(
      content.plan.blocks.every((block) =>
        block.sessions.every((session) => session.rows.length === 0),
      ),
    ).toBe(true);
    expect(content.plan.blocks.map((block) => block.trainingDays)).toEqual([
      3, 3, 3,
    ]);
  });

  it("names the sessions from the split template and gives each its own origin", () => {
    // act
    const content = suggestionsOver([]).initialContent({
      ...SETUP,
      trainingDays: 4,
      splitShape: "upper-lower",
    });

    // assert
    const [session] = content.plan.blocks[0].sessions;
    expect(content.plan.blocks[0].sessions.map((s) => s.name)).toEqual([
      "Lower A",
      "Upper A",
      "Lower B",
      "Upper B",
    ]);
    expect(session.originId).toBe(session.id);
  });

  it("starts every session with an empty warm-up and the cool-down off", () => {
    // act
    const [session] = suggestionsOver([]).initialContent(SETUP).plan.blocks[0]
      .sessions;

    // assert
    expect(session.warmUp).toEqual({ items: [] });
    expect(session.coolDown).toEqual({ enabled: false, items: [] });
  });

  it("builds the sessions of the chosen split rather than the one the days suggest", () => {
    // act
    const content = suggestionsOver([]).initialContent({
      ...SETUP,
      trainingDays: 4,
      splitShape: "full-body",
    });

    // assert
    expect(content.plan.blocks[0].split.shape).toBe("full-body");
    expect(content.plan.blocks[0].sessions.map((s) => s.name)).toEqual([
      "Full Body A",
      "Full Body B",
      "Full Body C",
      "Full Body D",
    ]);
    expect(content.plan.blocks.map((block) => block.trainingDays)).toEqual([
      4, 4, 4,
    ]);
  });

  it("fills texts and settings from the setup", () => {
    // act
    const [block] = suggestionsOver([]).initialContent({
      ...SETUP,
      sessionMinutes: 45,
      dailySteps: 7000,
    }).plan.blocks;

    // assert
    expect(block).toMatchObject({
      weeks: 4,
      targetMinutes: 45,
      dailySteps: 7000,
      calibrationWeek: false,
      clientNote: "",
    });
    expect(block.split.shape).toBe("full-body");
    expect(block.split.name).toBe("");
    expect(block.split.text).toContain("3x per week");
    expect(block.introText).toContain("Building your base");
    expect(block.missedDayNote).not.toBe("");
  });

  it("starts a Romanian program from the English texts", () => {
    // act
    const [romanian] = suggestionsOver([]).initialContent({
      ...SETUP,
      language: "ro",
    }).plan.blocks;
    const [english] = suggestionsOver([]).initialContent(SETUP).plan.blocks;

    // assert
    expect(romanian.introText).toBe(english.introText);
    expect(romanian.split.text).toBe(english.split.text);
  });

  it("places default cardio from the library in a fresh block", () => {
    // act
    const [block] = suggestionsOver([BIKE]).initialContent({
      ...SETUP,
      level: "intermediate",
    }).plan.blocks;

    // assert
    expect(block.cardioSessions.map((cardio) => cardio.name)).toEqual([
      "Easy cardio",
      "Easy cardio",
      "Moderate cardio",
    ]);
    expect(block.cardioSessions[0].segments[0]).toMatchObject({
      kind: "steady",
      exerciseId: "bike",
    });
  });

  it("lays out the sessions and cardio of a fresh block on its split", () => {
    // act
    const [block] = suggestionsOver([]).initialContent(SETUP).plan.blocks;

    // assert
    const [a, b, c] = block.sessions.map((session) => session.id);
    const [easy, easyAgain] = block.cardioSessions.map((cardio) => cardio.id);
    expect(block.calendar).toEqual({
      mon: { kind: "session", sessionId: a },
      tue: { kind: "cardio", cardioId: easy },
      wed: { kind: "session", sessionId: b },
      thu: { kind: "cardio", cardioId: easyAgain },
      fri: { kind: "session", sessionId: c },
      sat: { kind: "rest" },
      sun: { kind: "rest" },
    });
  });

  it("keeps the sessions, calendar, cardio and split of the previous block in a deload, under new ids", () => {
    // act
    const [, previous, deload] = suggestionsOver([BIKE]).initialContent(SETUP)
      .plan.blocks;

    // assert
    expect(deload.type).toBe("deload");
    expect(deload.originId).not.toBe(previous.originId);
    expect(deload.id).not.toBe(previous.id);
    expect(deload.sessions[0].id).not.toBe(previous.sessions[0].id);
    expect(deload.sessions[0].originId).toBe(previous.sessions[0].originId);
    expect(deload.split).toEqual(previous.split);
    expect(deload.cardioSessions.map((cardio) => cardio.name)).toEqual(
      previous.cardioSessions.map((cardio) => cardio.name),
    );
    expect(deload.cardioSessions[0].id).not.toBe(previous.cardioSessions[0].id);
    expect(deload.cardioSessions[0].originId).toBe(
      previous.cardioSessions[0].originId,
    );
    const kinds = (block: Block) =>
      Object.values(block.calendar).map((entry) => entry.kind);
    expect(kinds(deload)).toEqual(kinds(previous));
    expect(calendarIds(deload, "cardio").sort()).toEqual(
      deload.cardioSessions.map((cardio) => cardio.id).sort(),
    );
    expect(calendarIds(deload, "session").sort()).toEqual(
      deload.sessions.map((session) => session.id).sort(),
    );
  });

  it("gives a deload the deload texts and the setup's session length and steps", () => {
    // act
    const [, , deload] = suggestionsOver([]).initialContent({
      ...SETUP,
      sessionMinutes: 30,
      dailySteps: 8000,
    }).plan.blocks;

    // assert
    expect(deload.introText).toContain("Recovery on purpose");
    expect(deload).toMatchObject({
      weeks: 1,
      calibrationWeek: false,
      clientNote: "",
      targetMinutes: 30,
      dailySteps: 8000,
    });
  });

  it("starts a loading block after another from its sessions, split and training days, with fresh cardio", () => {
    // act
    const [, deload, next] = suggestionsOver([BIKE]).initialContent({
      ...SETUP,
      level: "intermediate",
    }).plan.blocks;

    // assert
    expect(next.type).toBe("hypertrophy");
    expect(next.sessions.map((session) => session.originId)).toEqual(
      deload.sessions.map((session) => session.originId),
    );
    expect(next.sessions[0].id).not.toBe(deload.sessions[0].id);
    expect(next.split).toEqual(deload.split);
    expect(next.trainingDays).toBe(deload.trainingDays);
    expect(next.introText).toContain("Building muscle");
    expect(next.cardioSessions.map((cardio) => cardio.name)).toEqual([
      "Easy cardio",
      "Easy cardio",
      "Moderate cardio",
    ]);
    expect(next.cardioSessions.map((cardio) => cardio.originId)).not.toContain(
      deload.cardioSessions[0].originId,
    );
    expect(calendarIds(next, "session")).toEqual(
      next.sessions.map((session) => session.id),
    );
  });
});

describe("ProgramSuggestions newBlock", () => {
  it("adds a block of the chosen type and weeks after the last one, from its sessions, without a calibration week", () => {
    // arrange
    const suggestions = suggestionsOver([BIKE]);
    const [previous] = suggestions.initialContent({
      ...SETUP,
      level: "intermediate",
    }).plan.blocks;

    // act
    const block = suggestions.newBlock("strength", 5, {
      setup: SETUP,
      previous,
    });

    // assert
    expect(block).toMatchObject({
      type: "strength",
      weeks: 5,
      calibrationWeek: false,
      trainingDays: previous.trainingDays,
      split: previous.split,
    });
    expect(block.sessions.map((session) => session.originId)).toEqual(
      previous.sessions.map((session) => session.originId),
    );
    expect(block.introText).toContain("Getting stronger");
  });

  it("prefills a Deload from the block before it, one week long", () => {
    // arrange
    const suggestions = suggestionsOver([]);
    const [previous] = suggestions.initialContent(SETUP).plan.blocks;

    // act
    const deload = suggestions.newBlock("deload", 1, {
      setup: SETUP,
      previous,
    });

    // assert
    expect(deload).toMatchObject({ type: "deload", weeks: 1 });
    expect(deload.sessions.map((session) => session.originId)).toEqual(
      previous.sessions.map((session) => session.originId),
    );
  });

  it("builds a first block from the setup when there is no block before it", () => {
    // act
    const block = suggestionsOver([]).newBlock("hypertrophy", 4, {
      setup: { ...SETUP, trainingDays: 4, splitShape: "upper-lower" },
    });

    // assert
    expect(block).toMatchObject({ type: "hypertrophy", weeks: 4 });
    expect(block.sessions.map((session) => session.name)).toEqual([
      "Lower A",
      "Upper A",
      "Lower B",
      "Upper B",
    ]);
  });
});

describe("ProgramSuggestions proposedBlockAfter", () => {
  it("proposes a Deload after four or more weeks of Hypertrophy or Strength", () => {
    // act
    const proposals = [
      ProgramSuggestions.proposedBlockAfter({ type: "hypertrophy", weeks: 4 }),
      ProgramSuggestions.proposedBlockAfter({ type: "strength", weeks: 6 }),
    ];

    // assert
    expect(proposals).toEqual([
      { type: "deload", weeks: 1 },
      { type: "deload", weeks: 1 },
    ]);
  });

  it("proposes four weeks of Hypertrophy otherwise", () => {
    // act
    const proposals = [
      ProgramSuggestions.proposedBlockAfter(undefined),
      ProgramSuggestions.proposedBlockAfter({ type: "hypertrophy", weeks: 3 }),
      ProgramSuggestions.proposedBlockAfter({ type: "foundation", weeks: 6 }),
      ProgramSuggestions.proposedBlockAfter({ type: "deload", weeks: 1 }),
    ];

    // assert
    expect(proposals).toEqual(
      proposals.map(() => ({ type: "hypertrophy", weeks: 4 })),
    );
  });
});
