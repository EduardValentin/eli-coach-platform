import { describe, expect, it } from "vitest";

import { programDraftSaveRequestSchema } from "./program-draft";

const BLOCK = {
  id: "block-1",
  originId: "block-1",
  type: "foundation",
  weeks: 4,
  trainingDays: 2,
  calibrationWeek: false,
  introText: "",
  clientNote: "",
  split: { shape: "full-body", name: "", text: "" },
  targetMinutes: 45,
  calendar: {
    mon: { kind: "session", sessionId: "session-1" },
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
      name: "Full Body A",
      warmUp: { items: [] },
      coolDown: { enabled: false, items: [] },
      rows: [],
    },
  ],
  cardioSessions: [],
  dailySteps: 6000,
  missedDayNote: "",
};

function saveRequest(block: Record<string, unknown> = BLOCK) {
  return {
    content: {
      header: { title: "", focus: "", personalNote: "" },
      plan: { blocks: [block] },
      nutritionNotes: "",
      lifestyleNotes: "",
    },
    level: "beginner",
    language: "en",
    updatedAt: "2026-11-21T10:30:00.000Z",
  };
}

describe("programDraftSaveRequestSchema", () => {
  it("reads the whole draft, its level and language and the copy it was made from", () => {
    // act
    const parsed = programDraftSaveRequestSchema.safeParse(saveRequest());

    // assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["no weeks", { ...BLOCK, weeks: 0 }],
    ["part of a week", { ...BLOCK, weeks: 1.5 }],
    ["a session length outside the choices", { ...BLOCK, targetMinutes: 50 }],
    ["daily steps outside the choices", { ...BLOCK, dailySteps: 6500 }],
    ["an unknown block type", { ...BLOCK, type: "peaking" }],
    ["a field the draft does not have", { ...BLOCK, colour: "red" }],
  ])("refuses a block with %s", (_problem, block) => {
    // act
    const parsed = programDraftSaveRequestSchema.safeParse(saveRequest(block));

    // assert
    expect(parsed.success).toBe(false);
  });

  it("refuses a copy marker that is not an instant", () => {
    // act
    const parsed = programDraftSaveRequestSchema.safeParse({
      ...saveRequest(),
      updatedAt: "yesterday",
    });

    // assert
    expect(parsed.success).toBe(false);
  });
});
