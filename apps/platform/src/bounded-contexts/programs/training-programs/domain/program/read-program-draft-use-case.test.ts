import { describe, expect, it } from "vitest";

import type { ClientCoaching } from "./client-coaching-port";
import type { ClientIdentity } from "./client-identity-port";
import { EQUIPMENT, type LibraryExercise } from "./library-exercise";
import { Program } from "./program";
import type { ProgramContent } from "./program-content";
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
      trainingPlace: "Gym",
      limitations: "Lower back, no heavy hinges",
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

function libraryExercise(
  id: string,
  name: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name,
    type: "cardio",
    unit: "time",
    perSide: false,
    pattern: null,
    role: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    tags: [],
    cues: "",
    videoPath: null,
    archived: false,
    ...overrides,
  };
}

const WALKING = libraryExercise("exercise-walk", "Walking");
const ARCHIVED_SQUAT = libraryExercise("exercise-squat", "Back squat", {
  type: "resistance",
  unit: "reps",
  archived: true,
});

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
    libraryExercisesPort: {
      listFor: async (coachAccountId) =>
        coachAccountId === COACH_ACCOUNT_ID ? [WALKING, ARCHIVED_SQUAT] : [],
    },
    programStorePort: {
      findByClientId: async (clientId) =>
        programs.find((program) => program.clientId === clientId) ?? null,
    },
  });
}

describe("ReadProgramDraftUseCase", () => {
  it("reads her draft with the program's level and language, when the draft was last saved, and what a new block starts from", async () => {
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
      startingBlockSetup: {
        splitShape: "upper-lower",
        trainingDays: 4,
        sessionMinutes: 45,
        dailySteps: 6000,
        language: "ro",
      },
      libraryExercises: [WALKING, ARCHIVED_SQUAT],
      coachingFacts: {
        goal: "Build muscle",
        level: "intermediate",
        trainingDays: 4,
        sessionMinutes: 45,
        equipment: ["Full gym"],
        trainingPlace: "Gym",
        limitations: "Lower back, no heavy hinges",
      },
      libraryEquipment: [...EQUIPMENT],
    });
  });

  it("maps her equipment to the library's equipment", async () => {
    // arrange
    const readProgramDraftUseCase = readDraft({
      clientCoaching: {
        ...APPROVED,
        answers: {
          status: "approved",
          coachingFacts: {
            goal: "Build muscle",
            level: "intermediate",
            trainingDays: 4,
            sessionMinutes: 45,
            equipment: ["Dumbbells", "Resistance bands"],
            trainingPlace: "Home",
            limitations: "",
          },
        },
      },
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
      libraryEquipment: ["Dumbbells", "Bench", "Bands"],
    });
  });

  it("shows no client profile and none of her equipment while her answers are not approved", async () => {
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
      coachingFacts: null,
      libraryEquipment: [],
    });
  });

  it("starts a new block from three days of an hour while her answers are not approved", async () => {
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
      startingBlockSetup: {
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
