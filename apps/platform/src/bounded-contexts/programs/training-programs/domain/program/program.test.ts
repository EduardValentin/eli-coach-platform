import { describe, expect, it } from "vitest";

import type {
  ClientCoaching,
  ClientCoachingFacts,
} from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { Program, type ProgramSnapshot } from "./program";
import type { Block, ProgramContent } from "./program-content";
import { ProgramSetup } from "./program-setup";
import { ProgramSuggestions } from "./program-suggestions";
import type { ProgramVersionSnapshot } from "./program-version";
import type { VersionStatus } from "./vocabulary";

const NOW = new Date("2026-11-20T09:00:00.000Z");

const EMPTY_CONTENT: ProgramContent = {
  header: { title: "", focus: "", personalNote: "" },
  plan: { blocks: [] },
  nutritionNotes: "",
  lifestyleNotes: "",
};

const FACTS: ClientCoachingFacts = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Dumbbells"],
};

const CLIENT: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
};

const CLIENT_COACHING: ClientCoaching = {
  answers: { status: "approved", coachingFacts: FACTS },
  equipmentOptions: [{ value: "Dumbbells", exclusive: false }],
  goalOptions: ["Lose fat", "Build muscle"],
};

const NOT_APPROVED: ClientCoaching = {
  ...CLIENT_COACHING,
  answers: { status: "not-approved" },
};

function version(
  number: number,
  status: VersionStatus,
): ProgramVersionSnapshot {
  return {
    number,
    status,
    content: EMPTY_CONTENT,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function programWith(versions: ProgramVersionSnapshot[]): Program {
  const snapshot: ProgramSnapshot = {
    id: "program-1",
    clientId: "client-1",
    goal: "Build muscle",
    level: "beginner",
    language: "en",
    createdAt: NOW,
    updatedAt: NOW,
    versions,
  };

  return Program.reconstitute(snapshot);
}

describe("Program.started", () => {
  it("records the goal, level and language of the setup and the content as a version 1 draft, created now", () => {
    // arrange
    const result = ProgramSetup.from(
      {
        goal: "Lose fat",
        level: "intermediate",
        trainingDays: 3,
        sessionMinutes: 45,
        language: "ro",
        dailySteps: 6000,
        splitShape: "full-body",
        equipment: ["Dumbbells"],
      },
      CLIENT_COACHING,
    );
    if (result.status === "invalid") throw new Error("expected a valid setup");

    // act
    const program = Program.started({
      id: "program-1",
      clientId: "client-1",
      setup: result.setup,
      content: EMPTY_CONTENT,
      at: NOW,
    });

    // assert
    expect(program.toSnapshot()).toEqual({
      id: "program-1",
      clientId: "client-1",
      goal: "Lose fat",
      level: "intermediate",
      language: "ro",
      createdAt: NOW,
      updatedAt: NOW,
      versions: [version(1, "draft")],
    });
  });
});

describe("Program draft summary", () => {
  it("summarises the draft among the program's versions", () => {
    // arrange
    const program = programWith([
      version(1, "superseded"),
      version(2, "published"),
      version(3, "draft"),
    ]);

    // act
    const summary = program.draftSummary();

    // assert
    expect(summary?.versionNumber).toBe(3);
  });

  it("has no draft summary when no version is a draft", () => {
    // act
    const summaries = [
      programWith([version(1, "published")]).draftSummary(),
      programWith([]).draftSummary(),
    ];

    // assert
    expect(summaries).toEqual([null, null]);
  });
});

describe("Program.eligibilityFor", () => {
  it("finds her program first, even once her coaching has ended", () => {
    // arrange
    const program = programWith([version(1, "draft")]);

    // act
    const eligibility = Program.eligibilityFor({
      client: CLIENT,
      coachingEnded: true,
      clientCoaching: CLIENT_COACHING,
      program,
    });

    // assert
    expect(eligibility).toEqual({
      status: "has-program",
      client: CLIENT,
      coachingEnded: true,
      clientCoaching: CLIENT_COACHING,
      program,
    });
  });

  it("puts ended coaching before answers that are not approved", () => {
    // act
    const eligibility = Program.eligibilityFor({
      client: CLIENT,
      coachingEnded: true,
      clientCoaching: NOT_APPROVED,
      program: null,
    });

    // assert
    expect(eligibility.status).toBe("coaching-ended");
  });

  it("waits for her answers to be approved", () => {
    // act
    const eligibility = Program.eligibilityFor({
      client: CLIENT,
      coachingEnded: false,
      clientCoaching: NOT_APPROVED,
      program: null,
    });

    // assert
    expect(eligibility.status).toBe("not-approved");
  });

  it("lets the coach start a program for an approved client in coaching, from her coaching facts", () => {
    // act
    const eligibility = Program.eligibilityFor({
      client: CLIENT,
      coachingEnded: false,
      clientCoaching: CLIENT_COACHING,
      program: null,
    });

    // assert
    expect(eligibility).toEqual({
      status: "eligible",
      client: CLIENT,
      coachingEnded: false,
      clientCoaching: CLIENT_COACHING,
      coachingFacts: FACTS,
    });
  });
});

const LATER = new Date("2026-11-21T10:30:00.000Z");

function suggestedContent(): ProgramContent {
  let next = 0;

  return new ProgramSuggestions({
    cardioExercises: [],
    newId: () => `id-${(next += 1)}`,
  }).initialContent({
    goal: "Lose fat",
    level: "beginner",
    trainingDays: 3,
    sessionMinutes: 60,
    language: "en",
    dailySteps: 6000,
    splitShape: "full-body",
    equipment: ["Dumbbells"],
  });
}

function withFirstBlock(
  content: ProgramContent,
  change: (block: Block) => Block,
): ProgramContent {
  const [first, ...others] = content.plan.blocks;

  return { ...content, plan: { blocks: [change(first), ...others] } };
}

describe("Program saveDraft", () => {
  it("replaces the draft's content and takes the level and language while version 1 is a draft, saved now", () => {
    // arrange
    const program = programWith([version(1, "draft")]);
    const content = suggestedContent();

    // act
    const saving = program.saveDraft({
      content,
      level: "advanced",
      language: "ro",
      at: LATER,
    });

    // assert
    if (saving.status !== "saved") throw new Error("expected a saved draft");
    expect(saving.program.toSnapshot()).toMatchObject({
      level: "advanced",
      language: "ro",
      createdAt: NOW,
      updatedAt: LATER,
      versions: [
        {
          number: 1,
          status: "draft",
          content,
          createdAt: NOW,
          updatedAt: LATER,
        },
      ],
    });
    expect(saving.program.draft()).toEqual({
      versionNumber: 1,
      content,
      updatedAt: LATER,
    });
  });

  it("saves a plan with sequence problems, which only stop publishing", () => {
    // arrange
    const program = programWith([version(1, "draft")]);
    const content = suggestedContent();
    const deloadFirst = {
      ...content,
      plan: { blocks: [...content.plan.blocks].reverse() },
    };

    // act
    const saving = program.saveDraft({
      content: deloadFirst,
      level: "beginner",
      language: "en",
      at: LATER,
    });

    // assert
    expect(saving.status).toBe("saved");
  });

  it("changes only the draft among the program's versions", () => {
    // arrange
    const program = programWith([version(1, "published"), version(2, "draft")]);
    const content = suggestedContent();

    // act
    const saving = program.saveDraft({
      content,
      level: "beginner",
      language: "en",
      at: LATER,
    });

    // assert
    if (saving.status !== "saved") throw new Error("expected a saved draft");
    expect(saving.program.toSnapshot().versions).toEqual([
      version(1, "published"),
      { ...version(2, "draft"), content, updatedAt: LATER },
    ]);
  });

  it("refuses a save when no version is a draft", () => {
    // arrange
    const program = programWith([version(1, "published")]);

    // act
    const saving = program.saveDraft({
      content: suggestedContent(),
      level: "beginner",
      language: "en",
      at: LATER,
    });

    // assert
    expect(saving).toEqual({ status: "not-a-draft" });
  });

  it("refuses a change of level or language once version 1 is no longer the draft", () => {
    // arrange
    const program = programWith([version(1, "published"), version(2, "draft")]);

    // act
    const savings = [
      program.saveDraft({
        content: suggestedContent(),
        level: "advanced",
        language: "en",
        at: LATER,
      }),
      program.saveDraft({
        content: suggestedContent(),
        level: "beginner",
        language: "ro",
        at: LATER,
      }),
    ];

    // assert
    expect(savings).toEqual([
      { status: "not-a-draft" },
      { status: "not-a-draft" },
    ]);
  });

  it("refuses a Deload that is not one week long", () => {
    // arrange
    const program = programWith([version(1, "draft")]);
    const content = suggestedContent();
    const longDeload = {
      ...content,
      plan: {
        blocks: content.plan.blocks.map((block) =>
          block.type === "deload" ? { ...block, weeks: 2 } : block,
        ),
      },
    };

    // act
    const saving = program.saveDraft({
      content: longDeload,
      level: "beginner",
      language: "en",
      at: LATER,
    });

    // assert
    expect(saving).toEqual({ status: "not-well-formed" });
  });

  it("refuses a day naming a session or cardio day its block does not hold", () => {
    // arrange
    const program = programWith([version(1, "draft")]);
    const content = suggestedContent();
    const unknownSession = withFirstBlock(content, (block) => ({
      ...block,
      calendar: { ...block.calendar, sun: { kind: "session", sessionId: "x" } },
    }));
    const unknownCardio = withFirstBlock(content, (block) => ({
      ...block,
      calendar: { ...block.calendar, sun: { kind: "cardio", cardioId: "x" } },
    }));
    const otherBlocksSession = withFirstBlock(content, (block) => ({
      ...block,
      calendar: {
        ...block.calendar,
        sun: {
          kind: "session",
          sessionId: content.plan.blocks[1].sessions[0].id,
        },
      },
    }));

    // act
    const savings = [unknownSession, unknownCardio, otherBlocksSession].map(
      (changed) =>
        program.saveDraft({
          content: changed,
          level: "beginner",
          language: "en",
          at: LATER,
        }),
    );

    // assert
    expect(savings).toEqual(savings.map(() => ({ status: "not-well-formed" })));
  });
});

describe("Program draft", () => {
  it("reads the draft with its version number, content and when it was last saved", () => {
    // arrange
    const program = programWith([
      version(1, "published"),
      { ...version(2, "draft"), updatedAt: LATER },
    ]);

    // act
    const draft = program.draft();

    // assert
    expect(draft).toEqual({
      versionNumber: 2,
      content: EMPTY_CONTENT,
      updatedAt: LATER,
    });
  });

  it("has no draft when no version is a draft", () => {
    // act
    const draft = programWith([version(1, "published")]).draft();

    // assert
    expect(draft).toBeNull();
  });
});
