import { describe, expect, it } from "vitest";

import type { ClientCoaching } from "./client-coaching-port";
import { Program } from "./program";
import type { ProgramContent } from "./program-content";
import { ReadProgramCardUseCase } from "./read-program-card-use-case";

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

function readCard(clients: ClientCoaching[], programs: Program[] = []) {
  return new ReadProgramCardUseCase({
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

describe("ReadProgramCardUseCase", () => {
  it("summarises her draft, even once her coaching has ended", async () => {
    // arrange
    const readProgramCardUseCase = readCard(
      [{ ...ANA, coachingEnded: true }],
      [ANAS_PROGRAM],
    );

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "program",
      gender: "female",
      draft: { versionNumber: 1, blocks: [], stillMissing: [] },
    });
  });

  it("says her coaching has ended when she has no program, whether or not her answers were approved", async () => {
    // arrange
    const readProgramCardUseCase = readCard([
      {
        ...ANA,
        gender: "male",
        coachingEnded: true,
        answers: { status: "not-approved" },
      },
    ]);

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "coaching-ended", gender: "male" });
  });

  it("waits for her answers to be approved", async () => {
    // arrange
    const readProgramCardUseCase = readCard([
      { ...ANA, answers: { status: "not-approved" } },
    ]);

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "waiting", gender: "female" });
  });

  it("is ready to build for an approved client in coaching", async () => {
    // arrange
    const readProgramCardUseCase = readCard([ANA]);

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "ready-to-build", gender: "female" });
  });

  it("knows no client it cannot find", async () => {
    // arrange
    const readProgramCardUseCase = readCard([]);

    // act
    const reading = await readProgramCardUseCase.execute({
      clientId: CLIENT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });
});
