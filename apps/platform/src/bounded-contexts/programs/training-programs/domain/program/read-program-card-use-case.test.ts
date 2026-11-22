import { describe, expect, it } from "vitest";

import type { ClientCoaching } from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { Program } from "./program";
import type { ProgramContent } from "./program-content";
import { ReadProgramCardUseCase } from "./read-program-card-use-case";

const NOW = new Date("2026-11-20T09:00:00.000Z");
const CLIENT_ID = "client-1";

const ANA: ClientIdentity = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
};

const ANAS_COACHING: ClientCoaching = {
  answers: {
    status: "approved",
    coachingFacts: {
      goal: "Build muscle",
      level: "beginner",
      trainingDays: 3,
      sessionMinutes: 60,
      equipment: ["Dumbbells"],
    },
  },
  equipmentOptions: [{ value: "Dumbbells", exclusive: false }],
  goalOptions: ["Build muscle"],
};

const CONTENT: ProgramContent = {
  header: { title: "", focus: "", personalNote: "" },
  plan: { blocks: [] },
  nutritionNotes: "",
  lifestyleNotes: "",
};

const ANAS_PROGRAM = Program.reconstitute({
  id: "program-1",
  clientId: CLIENT_ID,
  goal: "Build muscle",
  level: "beginner",
  language: "en",
  createdAt: NOW,
  updatedAt: NOW,
  versions: [
    {
      number: 1,
      status: "draft",
      content: CONTENT,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
});

type Arrangement = {
  clients?: ClientIdentity[];
  coachingEnded?: boolean;
  clientCoaching?: ClientCoaching;
  programs?: Program[];
};

function readCard({
  clients = [ANA],
  coachingEnded = false,
  clientCoaching = ANAS_COACHING,
  programs = [],
}: Arrangement = {}) {
  return new ReadProgramCardUseCase({
    clientIdentityPort: {
      find: async (clientId) =>
        clients.find((client) => client.clientId === clientId) ?? null,
    },
    coachingEndedPort: { hasEnded: async () => coachingEnded },
    clientCoachingPort: { find: async () => clientCoaching },
    programStorePort: {
      findByClientId: async (clientId) =>
        programs.find((program) => program.clientId === clientId) ?? null,
    },
  });
}

describe("ReadProgramCardUseCase", () => {
  it("summarises her draft while she is in coaching", async () => {
    // arrange
    const readProgramCardUseCase = readCard({ programs: [ANAS_PROGRAM] });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "program",
      gender: "female",
      coachingEnded: false,
      draft: { versionNumber: 1, blocks: [], stillMissing: [] },
    });
  });

  it("summarises her draft once her coaching has ended, and says it has ended", async () => {
    // arrange
    const readProgramCardUseCase = readCard({
      coachingEnded: true,
      programs: [ANAS_PROGRAM],
    });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "program",
      gender: "female",
      coachingEnded: true,
      draft: { versionNumber: 1, blocks: [], stillMissing: [] },
    });
  });

  it("says her coaching has ended when she has no program, whether or not her answers were approved", async () => {
    // arrange
    const readProgramCardUseCase = readCard({
      clients: [{ ...ANA, gender: "male" }],
      coachingEnded: true,
      clientCoaching: { ...ANAS_COACHING, answers: { status: "not-approved" } },
    });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "coaching-ended", gender: "male" });
  });

  it("waits for her answers to be approved", async () => {
    // arrange
    const readProgramCardUseCase = readCard({
      clientCoaching: { ...ANAS_COACHING, answers: { status: "not-approved" } },
    });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "waiting", gender: "female" });
  });

  it("is ready to build for an approved client in coaching", async () => {
    // arrange
    const readProgramCardUseCase = readCard();

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "ready-to-build", gender: "female" });
  });

  it("knows no client it cannot find", async () => {
    // arrange
    const readProgramCardUseCase = readCard({ clients: [] });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });

  it("answers unknown-client without asking coaching or sales about someone clients does not know", async () => {
    // arrange
    const asked: string[] = [];
    const readProgramCardUseCase = new ReadProgramCardUseCase({
      clientIdentityPort: { find: async () => null },
      coachingEndedPort: {
        hasEnded: async () => {
          asked.push("sales");
          return false;
        },
      },
      clientCoachingPort: {
        find: async () => {
          asked.push("client profile");
          return ANAS_COACHING;
        },
      },
      programStorePort: { findByClientId: async () => null },
    });

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
    expect(asked).toEqual([]);
  });

  it.each(["clients", "sales", "client profile", "programs"] as const)(
    "fails whole when %s cannot be read, rather than guess her state",
    async (owner) => {
      // arrange
      const failure = new Error(`${owner} unreachable`);
      const answerOf = <Answer>(
        asked: typeof owner,
        answer: Answer,
      ): Promise<Answer> =>
        asked === owner ? Promise.reject(failure) : Promise.resolve(answer);
      const readProgramCardUseCase = new ReadProgramCardUseCase({
        clientIdentityPort: { find: () => answerOf("clients", ANA) },
        coachingEndedPort: { hasEnded: () => answerOf("sales", false) },
        clientCoachingPort: {
          find: () => answerOf("client profile", ANAS_COACHING),
        },
        programStorePort: {
          findByClientId: () => answerOf("programs", null),
        },
      });

      // act
      const read = readProgramCardUseCase.execute({ clientId: CLIENT_ID });

      // assert
      await expect(read).rejects.toBe(failure);
    },
  );
});
