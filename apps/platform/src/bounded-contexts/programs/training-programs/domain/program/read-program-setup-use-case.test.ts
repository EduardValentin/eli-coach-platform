import { describe, expect, it } from "vitest";

import type { ClientCoaching } from "./client-coaching-port";
import { Program } from "./program";
import { ReadProgramSetupUseCase } from "./read-program-setup-use-case";

const NOW = new Date("2026-11-20T09:00:00.000Z");
const CLIENT_ID = "client-1";

const ANA: ClientCoaching = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
  coachingEnded: false,
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

function readSetup(clients: ClientCoaching[], programs: Program[] = []) {
  return new ReadProgramSetupUseCase({
    clientCoachingPort: {
      find: async (clientId) =>
        clients.find((client) => client.clientId === clientId) ?? null,
    },
    programStorePort: {
      findByClientId: async (clientId) =>
        programs.find((program) => program.clientId === clientId) ?? null,
    },
  });
}

describe("ReadProgramSetupUseCase", () => {
  it("prefills the setup from her coaching facts, with her equipment options and the split for each training-day count", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup([ANA]);

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
      equipmentOptions: ANA.equipmentOptions,
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
    const readProgramSetupUseCase = readSetup([]);

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });

  it("is not available once she has a program, even when her coaching has ended", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup(
      [{ ...ANA, coachingEnded: true }],
      [ANAS_PROGRAM],
    );

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "has-program" });
  });

  it("is not available once her coaching has ended, whether or not her answers were approved", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup([
      { ...ANA, coachingEnded: true, answers: { status: "not-approved" } },
    ]);

    // act
    const reading = await readProgramSetupUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "coaching-ended" });
  });

  it("waits for her answers to be approved, naming her", async () => {
    // arrange
    const readProgramSetupUseCase = readSetup([
      { ...ANA, answers: { status: "not-approved" } },
    ]);

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
});
