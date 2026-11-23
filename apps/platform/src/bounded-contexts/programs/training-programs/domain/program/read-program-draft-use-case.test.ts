import { describe, expect, it } from "vitest";

import type { CardioExercise } from "./cardio-exercises-port";
import type { ClientCoaching } from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { Program } from "./program";
import type { Block, ProgramContent } from "./program-content";
import { ProgramSuggestions } from "./program-suggestions";
import type { ProgramVersionSnapshot } from "./program-version";
import { ReadProgramDraftUseCase } from "./read-program-draft-use-case";

const CREATED = new Date("2026-11-20T09:00:00.000Z");
const SAVED = new Date("2026-11-21T10:30:00.000Z");
const CLIENT_ID = "client-1";
const COACH_ACCOUNT_ID = "coach-1";

const APPROVED: ClientCoaching = {
  answers: {
    status: "approved",
    coachingFacts: {
      goal: "Build muscle",
      level: "intermediate",
      trainingDays: 4,
      sessionMinutes: 45,
      equipment: ["Full gym"],
    },
  },
  equipmentOptions: [],
  goalOptions: [],
};

const NOT_APPROVED: ClientCoaching = {
  answers: { status: "not-approved" },
  equipmentOptions: [],
  goalOptions: [],
};

const WALKING: CardioExercise = { id: "exercise-walk", name: "Walking" };

const ANA: ClientIdentity = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
};

const CONTENT: ProgramContent = {
  header: { title: "", focus: "", personalNote: "" },
  plan: { blocks: [] },
  nutritionNotes: "",
  lifestyleNotes: "",
};

function anasProgram(versions: ProgramVersionSnapshot[]): Program {
  return Program.reconstitute({
    id: "program-1",
    clientId: CLIENT_ID,
    goal: "Build muscle",
    level: "intermediate",
    language: "ro",
    createdAt: CREATED,
    updatedAt: SAVED,
    versions,
  });
}

const DRAFT_VERSION: ProgramVersionSnapshot = {
  number: 1,
  status: "draft",
  content: CONTENT,
  createdAt: CREATED,
  updatedAt: SAVED,
};

function initialBlock(): Block {
  let id = 0;
  const programSuggestions = new ProgramSuggestions({
    cardioExercises: [],
    newId: () => `id-${(id += 1)}`,
  });

  return programSuggestions.newBlock("foundation", 4, {
    setup: {
      splitShape: "full-body",
      trainingDays: 3,
      sessionMinutes: 60,
      dailySteps: 6000,
      language: "en",
    },
  });
}

type Arrangement = {
  clients?: ClientIdentity[];
  coachingEnded?: boolean;
  clientCoaching?: ClientCoaching;
  programs?: Program[];
};

function readDraft({
  clients = [ANA],
  coachingEnded = false,
  clientCoaching = APPROVED,
  programs = [],
}: Arrangement = {}) {
  return new ReadProgramDraftUseCase({
    clientIdentityPort: {
      find: async (clientId) =>
        clients.find((client) => client.clientId === clientId) ?? null,
    },
    coachingEndedPort: { hasEnded: async () => coachingEnded },
    clientCoachingPort: { find: async () => clientCoaching },
    cardioExercisesPort: {
      listFor: async (coachAccountId) =>
        coachAccountId === COACH_ACCOUNT_ID ? [WALKING] : [],
    },
    programStorePort: {
      findByClientId: async (clientId) =>
        programs.find((program) => program.clientId === clientId) ?? null,
    },
  });
}

describe("ReadProgramDraftUseCase", () => {
  it("reads her draft with the program's level and language and when the draft was last saved", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({
      programs: [anasProgram([DRAFT_VERSION])],
    });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toEqual({
      status: "draft",
      client: ANA,
      coachingEnded: false,
      level: "intermediate",
      language: "ro",
      draft: { versionNumber: 1, content: CONTENT, updatedAt: SAVED },
      blockSetup: {
        splitShape: "upper-lower",
        trainingDays: 4,
        sessionMinutes: 45,
        dailySteps: 6000,
        language: "ro",
      },
      cardioExercises: [WALKING],
    });
  });

  it("takes a new block's split from the plan's first block", async () => {
    // arrange
    const block = initialBlock();
    const readProgramDraftUseCase = readDraft({
      programs: [
        anasProgram([
          {
            ...DRAFT_VERSION,
            content: { ...CONTENT, plan: { blocks: [block] } },
          },
        ]),
      ],
    });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toMatchObject({
      status: "draft",
      blockSetup: { splitShape: block.split.shape },
    });
  });

  it("sets up a new block from three days of an hour while her answers are not approved", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({
      clientCoaching: NOT_APPROVED,
      programs: [anasProgram([DRAFT_VERSION])],
    });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toMatchObject({
      status: "draft",
      blockSetup: {
        splitShape: "full-body",
        trainingDays: 3,
        sessionMinutes: 60,
        dailySteps: 6000,
        language: "ro",
      },
    });
  });

  it("still reads her draft once her coaching has ended", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({
      coachingEnded: true,
      programs: [anasProgram([DRAFT_VERSION])],
    });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toMatchObject({ status: "draft", coachingEnded: true });
  });

  it("says she has no program yet", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft();

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "no-program", client: ANA });
  });

  it("says her program holds no draft", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({
      programs: [anasProgram([{ ...DRAFT_VERSION, status: "published" }])],
    });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "no-draft" });
  });

  it("does not know a client no one paid for", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({ clients: [] });

    // act
    const reading = await readProgramDraftUseCase.execute({
      clientId: CLIENT_ID,
      coachAccountId: COACH_ACCOUNT_ID,
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });
});
