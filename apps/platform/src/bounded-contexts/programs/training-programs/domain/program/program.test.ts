import { describe, expect, it } from "vitest";

import type {
  ClientCoaching,
  ClientCoachingFacts,
} from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { Program, type ProgramSnapshot } from "./program";
import type { ProgramContent } from "./program-content";
import { ProgramSetup } from "./program-setup";
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
