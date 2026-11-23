import { describe, expect, it } from "vitest";

import type { ClientCoaching } from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { Program } from "./program";
import { ReadProgramSetupUseCase } from "./read-program-setup-use-case";

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
      level: "intermediate",
      trainingDays: 4,
      sessionMinutes: 45,
      equipment: ["Dumbbells"],
    },
  },
  equipmentOptions: [
    { value: "Dumbbells", exclusive: false },
    { value: "Bodyweight only", exclusive: true },
  ],
  goalOptions: ["Lose fat", "Build muscle"],
};

const ANAS_PROGRAM = Program.reconstitute({
  id: "program-1",
  clientId: CLIENT_ID,
  goal: "Build muscle",
  level: "intermediate",
  language: "en",
  createdAt: NOW,
  updatedAt: NOW,
  versions: [],
});

type Arrangement = {
  clients?: ClientIdentity[];
  coachingEnded?: boolean;
  clientCoaching?: ClientCoaching;
  programs?: Program[];
};

function readSetup({
  clients = [ANA],
  coachingEnded = false,
  clientCoaching = ANAS_COACHING,
  programs = [],
}: Arrangement = {}) {
  return new ReadProgramSetupUseCase({
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

describe("ReadProgramSetupUseCase", () => {
  it("prefills the setup from her coaching facts, with her goal and equipment options and the split for each training-day count", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup();

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "ready",
      client: {
        clientId: CLIENT_ID,
        firstName: "Ana",
        lastName: "Popescu",
        gender: "female",
      },
      startingValues: {
        goal: "Build muscle",
        level: "intermediate",
        trainingDays: 4,
        sessionMinutes: 45,
        language: "en",
        dailySteps: 6000,
        splitShape: "upper-lower",
        equipment: ["Dumbbells"],
      },
      goalOptions: ["Lose fat", "Build muscle"],
      equipmentOptions: ANAS_COACHING.equipmentOptions,
      splitShapeByTrainingDays: {
        2: "full-body",
        3: "full-body",
        4: "upper-lower",
        5: "upper-lower",
      },
    });
  });

  it("knows no client it cannot find", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup({ clients: [] });

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });

  it("is not available once she has a program, even when her coaching has ended", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup({
      coachingEnded: true,
      programs: [ANAS_PROGRAM],
    });

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "has-program" });
  });

  it("is not available once her coaching has ended, whether or not her answers were approved", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup({
      coachingEnded: true,
      clientCoaching: { ...ANAS_COACHING, answers: { status: "not-approved" } },
    });

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "coaching-ended" });
  });

  it("waits for her answers to be approved, naming her", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup({
      clientCoaching: { ...ANAS_COACHING, answers: { status: "not-approved" } },
    });

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "not-approved",
      client: {
        clientId: CLIENT_ID,
        firstName: "Ana",
        lastName: "Popescu",
        gender: "female",
      },
    });
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
      const readProgramSetupUseCase = new ReadProgramSetupUseCase({
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
      const read = readProgramSetupUseCase.execute({ clientId: CLIENT_ID });

      // assert
      await expect(read).rejects.toBe(failure);
    },
  );
});
