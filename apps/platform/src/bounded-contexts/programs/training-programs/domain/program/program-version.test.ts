import { describe, expect, it } from "vitest";

import type { ExerciseRow, ProgramContent, Session } from "./program-content";
import type { ProgramSetupValues } from "./program-setup";
import { ProgramSuggestions } from "./program-suggestions";
import { ProgramVersion } from "./program-version";

const NOW = new Date("2026-11-20T09:00:00.000Z");

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

function suggestedContent(): ProgramContent {
  let next = 0;

  return new ProgramSuggestions({
    libraryExercises: [],
    newId: () => `id-${(next += 1)}`,
  }).initialContent(SETUP);
}

function row(exerciseId: string): ExerciseRow {
  return {
    id: `row-${exerciseId}`,
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

function withRows(session: Session, rows: ExerciseRow[]): Session {
  return { ...session, rows };
}

function firstBlockWithSessions(
  content: ProgramContent,
  change: (sessions: Session[]) => Session[],
): ProgramContent {
  const [first, ...others] = content.plan.blocks;

  return {
    ...content,
    plan: {
      blocks: [{ ...first, sessions: change(first.sessions) }, ...others],
    },
  };
}

describe("ProgramVersion summary", () => {
  it("lists each block with its type, weeks and filled sessions, and counts every session without exercises as still missing", () => {
    // arrange
    const version = ProgramVersion.firstDraft({
      content: suggestedContent(),
      at: NOW,
    });

    // act
    const summary = version.summary();

    // assert
    expect(summary).toEqual({
      versionNumber: 1,
      blocks: [
        { type: "foundation", weeks: 4, filledSessions: 0, sessions: 3 },
        { type: "hypertrophy", weeks: 6, filledSessions: 0, sessions: 3 },
        { type: "deload", weeks: 1, filledSessions: 0, sessions: 3 },
      ],
      stillMissing: [{ kind: "sessions-without-exercises", count: 9 }],
    });
  });

  it("counts sessions with at least one chosen exercise", () => {
    // arrange
    const content = firstBlockWithSessions(
      suggestedContent(),
      ([first, ...rest]) => [withRows(first, [row("squat")]), ...rest],
    );

    // act
    const summary = ProgramVersion.firstDraft({ content, at: NOW }).summary();

    // assert
    expect(summary.blocks[0].filledSessions).toBe(1);
    expect(summary.stillMissing).toEqual([
      { kind: "sessions-without-exercises", count: 8 },
    ]);
  });

  it("needs at least one row with a chosen exercise for a session to count", () => {
    // arrange
    const content = firstBlockWithSessions(
      suggestedContent(),
      ([first, second, third]) => [
        withRows(first, []),
        withRows(second, [row("")]),
        withRows(third, [row(""), row("bench-press")]),
      ],
    );

    // act
    const summary = ProgramVersion.firstDraft({ content, at: NOW }).summary();

    // assert
    expect(summary.blocks[0].filledSessions).toBe(1);
  });

  it("is ready when every session holds an exercise", () => {
    // arrange
    const suggested = suggestedContent();
    const content: ProgramContent = {
      ...suggested,
      plan: {
        blocks: suggested.plan.blocks.map((block) => ({
          ...block,
          sessions: block.sessions.map((session) =>
            withRows(session, [row("squat")]),
          ),
        })),
      },
    };

    // act
    const summary = ProgramVersion.firstDraft({ content, at: NOW }).summary();

    // assert
    expect(summary.stillMissing).toEqual([]);
  });
});

describe("ProgramVersion.firstDraft", () => {
  it("is version 1, a draft, created and updated now", () => {
    // arrange
    const content = suggestedContent();

    // act
    const version = ProgramVersion.firstDraft({ content, at: NOW });

    // assert
    expect(version.toSnapshot()).toEqual({
      number: 1,
      status: "draft",
      content,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
});

function withFirstSession(change: (session: Session) => Session) {
  return firstBlockWithSessions(suggestedContent(), ([first, ...rest]) => [
    change(first),
    ...rest,
  ]);
}

function placed(
  exerciseId: string,
  placement: Partial<ExerciseRow>,
): ExerciseRow {
  return { ...row(exerciseId), ...placement };
}

describe("ProgramVersion.isWellFormed", () => {
  it("accepts a session with one main lift, one secondary, an accessory superset, two substitutions and four warm-up exercises", () => {
    // arrange
    const content = withFirstSession((session) => ({
      ...session,
      warmUp: {
        items: ["hips", "ankles", "cat-cow", "thoracic"].map((id) => ({
          id,
          exerciseId: id,
          sets: 1,
          seconds: 45,
        })),
      },
      coolDown: {
        enabled: false,
        items: [{ id: "c1", exerciseId: "pigeon", seconds: 30 }],
      },
      rows: [
        placed("squat", { slot: "A", substitutions: ["goblet", "leg-press"] }),
        placed("hinge", { slot: "B" }),
        placed("press", { slot: "C", supersetGroup: "g" }),
        placed("row", { slot: "C", supersetGroup: "g" }),
        placed("plank", { slot: "D", supersetGroup: "h" }),
      ],
    }));

    // act
    const wellFormed = ProgramVersion.isWellFormed(content);

    // assert
    expect(wellFormed).toBe(true);
  });

  it("refuses two exercises in the main lift or the secondary", () => {
    // arrange
    const twoMainLifts = withFirstSession((session) => ({
      ...session,
      rows: [placed("squat", { slot: "A" }), placed("hinge", { slot: "A" })],
    }));
    const twoSecondaries = withFirstSession((session) => ({
      ...session,
      rows: [placed("lunge", { slot: "B" }), placed("hinge", { slot: "B" })],
    }));

    // act
    const answers = [twoMainLifts, twoSecondaries].map((content) =>
      ProgramVersion.isWellFormed(content),
    );

    // assert
    expect(answers).toEqual([false, false]);
  });

  it("refuses a superset outside the accessories and the core", () => {
    // arrange
    const content = withFirstSession((session) => ({
      ...session,
      rows: [placed("squat", { slot: "A", supersetGroup: "g" })],
    }));

    // act
    const wellFormed = ProgramVersion.isWellFormed(content);

    // assert
    expect(wellFormed).toBe(false);
  });

  it("refuses more than two substitutions, or the row's own exercise as one", () => {
    // arrange
    const three = withFirstSession((session) => ({
      ...session,
      rows: [placed("squat", { substitutions: ["a", "b", "c"] })],
    }));
    const itself = withFirstSession((session) => ({
      ...session,
      rows: [placed("squat", { substitutions: ["squat"] })],
    }));

    // act
    const answers = [three, itself].map((content) =>
      ProgramVersion.isWellFormed(content),
    );

    // assert
    expect(answers).toEqual([false, false]);
  });

  it("refuses more than four warm-up exercises, or one exercise twice in the warm-up or the cool-down", () => {
    // arrange
    const fiveWarmUps = withFirstSession((session) => ({
      ...session,
      warmUp: {
        items: ["a", "b", "c", "d", "e"].map((id) => ({
          id,
          exerciseId: id,
          sets: 1,
          seconds: 45,
        })),
      },
    }));
    const warmUpTwice = withFirstSession((session) => ({
      ...session,
      warmUp: {
        items: ["w1", "w2"].map((id) => ({
          id,
          exerciseId: "hips",
          sets: 1,
          seconds: 45,
        })),
      },
    }));
    const coolDownTwice = withFirstSession((session) => ({
      ...session,
      coolDown: {
        enabled: true,
        items: ["c1", "c2"].map((id) => ({
          id,
          exerciseId: "pigeon",
          seconds: 30,
        })),
      },
    }));

    // act
    const answers = [fiveWarmUps, warmUpTwice, coolDownTwice].map((content) =>
      ProgramVersion.isWellFormed(content),
    );

    // assert
    expect(answers).toEqual([false, false, false]);
  });
});
