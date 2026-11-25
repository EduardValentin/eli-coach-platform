import { describe, expect, it } from "vitest";

import type { LibraryExercise } from "./library-exercise";
import { LibraryPicks } from "./library-picks";
import type { Block, Session } from "./program-content";
import { ProgramSuggestions } from "./program-suggestions";
import { SessionEditing } from "./session-editing";

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
    pattern: "isolation",
    role: null,
    primaryMuscles: ["Glutes"],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: `${id} cues`,
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const LIBRARY: LibraryExercise[] = [
  exercise("squat", { pattern: "squat" }),
  exercise("hinge", { pattern: "hinge" }),
  exercise("curl"),
  exercise("raise"),
  exercise("plank", { pattern: "core", primaryMuscles: ["Core"] }),
  exercise("hips", { type: "mobility", pattern: null }),
  exercise("hamstringStretch", {
    type: "stretching",
    unit: "time",
    pattern: null,
  }),
  exercise("burpee", {
    pattern: "conditioning",
    tags: ["Conditioning"],
  }),
];

function byId(id: string): LibraryExercise {
  return LIBRARY.find((item) => item.id === id) as LibraryExercise;
}

function idsFrom(prefix: string): () => string {
  let next = 0;

  return () => `${prefix}-${(next += 1)}`;
}

function foundationBlock(): Block {
  return new ProgramSuggestions({
    libraryExercises: [],
    newId: idsFrom("built"),
  }).newBlock("foundation", 4, {
    setup: {
      level: "beginner",
      trainingDays: 3,
      sessionMinutes: 60,
      language: "en",
      dailySteps: 6000,
      splitShape: "full-body",
    },
  });
}

function libraryPicks(): LibraryPicks {
  return new LibraryPicks({
    newId: idsFrom("picked"),
    libraryExercises: LIBRARY,
    libraryEquipment: [],
  });
}

function withSquatInA(session: Session): Session {
  return new SessionEditing({
    newId: idsFrom("edited"),
    blockType: "foundation",
    libraryExercises: LIBRARY,
    libraryEquipment: [],
  }).add(session, byId("squat"), { slot: "A" });
}

describe("LibraryPicks quickAddSlot", () => {
  const block = foundationBlock();

  it("picks the first open group whose plan matches the pattern", () => {
    // arrange
    const [session] = block.sessions;

    // act
    const slots = ["squat", "hinge", "plank"].map((id) =>
      LibraryPicks.quickAddSlot(block, session, byId(id)),
    );

    // assert
    expect(slots).toEqual(["A", "B", "D"]);
  });

  it("falls back to the accessories", () => {
    // arrange
    const session = withSquatInA(block.sessions[0]);

    // act
    const slot = LibraryPicks.quickAddSlot(block, session, byId("squat"));

    // assert
    expect(slot).toBe("C");
  });
});

describe("LibraryPicks blockWithLibraryPick", () => {
  it("adds an exercise without a target by its type: mobility to the warm-up, stretching to the cool-down, resistance to the slot its pattern fits", () => {
    // arrange
    const block = foundationBlock();
    const openSessionId = block.sessions[0].id;
    const picks = libraryPicks();
    const pick = (id: string) => ({
      exercise: byId(id),
      target: null,
      openSessionId,
    });

    // act
    const picked = ["hips", "hamstringStretch", "hinge", "curl"].reduce(
      (current, id) => picks.blockWithLibraryPick(current, pick(id)),
      block,
    );

    // assert
    const [session] = picked.sessions;
    expect(session.warmUp.items.map((item) => item.exerciseId)).toEqual([
      "hips",
    ]);
    expect(session.coolDown.items.map((item) => item.exerciseId)).toEqual([
      "hamstringStretch",
    ]);
    expect(session.rows.map((row) => [row.slot, row.exerciseId])).toEqual([
      ["B", "hinge"],
      ["C", "curl"],
    ]);
    expect(picked.sessions.slice(1)).toEqual(block.sessions.slice(1));
  });

  it("adds to the target the panel was opened for, in the target's session", () => {
    // arrange
    const block = foundationBlock();
    const [first, second] = block.sessions;
    const picks = libraryPicks();

    // act
    const inSlot = picks.blockWithLibraryPick(block, {
      exercise: byId("plank"),
      target: { kind: "slot", sessionId: second.id, slot: "C" },
      openSessionId: first.id,
    });
    const inWarmUp = picks.blockWithLibraryPick(inSlot, {
      exercise: byId("burpee"),
      target: { kind: "warm-up", sessionId: second.id },
      openSessionId: first.id,
    });
    const inCoolDown = picks.blockWithLibraryPick(inWarmUp, {
      exercise: byId("hamstringStretch"),
      target: { kind: "cool-down", sessionId: second.id },
      openSessionId: first.id,
    });

    // assert
    const session = inCoolDown.sessions[1];
    expect(session.rows.map((row) => [row.slot, row.exerciseId])).toEqual([
      ["C", "plank"],
    ]);
    expect(session.warmUp.items.map((item) => item.exerciseId)).toEqual([
      "burpee",
    ]);
    expect(session.coolDown.items.map((item) => item.exerciseId)).toEqual([
      "hamstringStretch",
    ]);
    expect(inCoolDown.sessions[0]).toEqual(first);
  });

  it("adds a substitution to the row it was picked for", () => {
    // arrange
    const block = foundationBlock();
    const filled = withSquatInA(block.sessions[0]);
    const start = { ...block, sessions: [filled, ...block.sessions.slice(1)] };
    const rowId = filled.rows[0].id;

    // act
    const picked = libraryPicks().blockWithLibraryPick(start, {
      exercise: byId("hinge"),
      target: { kind: "substitution", sessionId: filled.id, rowId },
      openSessionId: filled.id,
    });

    // assert
    expect(picked.sessions[0].rows[0].substitutions).toEqual(["hinge"]);
  });
});
