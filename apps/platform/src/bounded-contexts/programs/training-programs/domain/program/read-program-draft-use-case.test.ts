import { describe, expect, it } from "vitest";

import type { ClientIdentity } from "./client-identity-port";
import { Program } from "./program";
import type { ProgramContent } from "./program-content";
import type { ProgramVersionSnapshot } from "./program-version";
import { ReadProgramDraftUseCase } from "./read-program-draft-use-case";

const CREATED = new Date("2026-11-20T09:00:00.000Z");
const SAVED = new Date("2026-11-21T10:30:00.000Z");
const CLIENT_ID = "client-1";

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
  programs?: Program[];
};

function readDraft({
  clients = [ANA],
  coachingEnded = false,
  programs = [],
}: Arrangement = {}) {
  return new ReadProgramDraftUseCase({
    clientIdentityPort: {
      find: async (clientId) =>
        clients.find((client) => client.clientId === clientId) ?? null,
    },
    coachingEndedPort: { hasEnded: async () => coachingEnded },
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
    });

    // assert
    expect(reading).toEqual({
      status: "draft",
      client: ANA,
      coachingEnded: false,
      level: "intermediate",
      language: "ro",
      draft: { versionNumber: 1, content: CONTENT, updatedAt: SAVED },
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
    });

    // assert
    expect(reading).toEqual({ status: "unknown-client" });
  });
});
