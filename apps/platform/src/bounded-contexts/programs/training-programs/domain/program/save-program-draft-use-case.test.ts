import { describe, expect, it } from "vitest";

import type { ClientIdentity } from "./client-identity-port";
import { Program } from "./program";
import type { ProgramContent } from "./program-content";
import type { DraftSaveOutcome, DraftWrite } from "./program-store-port";
import type { ProgramVersionSnapshot } from "./program-version";
import { SaveProgramDraftUseCase } from "./save-program-draft-use-case";

const CREATED = new Date("2026-11-20T09:00:00.000Z");
const NOW = new Date("2026-11-21T10:30:00.000Z");
const CLIENT_ID = "client-1";

const ANA: ClientIdentity = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
};

const EMPTY_CONTENT: ProgramContent = {
  header: { title: "", focus: "", personalNote: "" },
  plan: { blocks: [] },
  nutritionNotes: "",
  lifestyleNotes: "",
};

const EDITED_CONTENT: ProgramContent = {
  ...EMPTY_CONTENT,
  header: { title: "Strong spring", focus: "", personalNote: "" },
};

const DRAFT_VERSION: ProgramVersionSnapshot = {
  number: 1,
  status: "draft",
  content: EMPTY_CONTENT,
  createdAt: CREATED,
  updatedAt: CREATED,
};

function anasProgram(versions: ProgramVersionSnapshot[]): Program {
  return Program.reconstitute({
    id: "program-1",
    clientId: CLIENT_ID,
    goal: "Build muscle",
    level: "beginner",
    language: "en",
    createdAt: CREATED,
    updatedAt: CREATED,
    versions,
  });
}

type Arrangement = {
  clients?: ClientIdentity[];
  programs?: Program[];
  storeOutcome?: DraftSaveOutcome;
};

function saveDraft({
  clients = [ANA],
  programs = [anasProgram([DRAFT_VERSION])],
  storeOutcome = "saved",
}: Arrangement = {}) {
  const writes: DraftWrite[] = [];
  const saveProgramDraftUseCase = new SaveProgramDraftUseCase({
    clientIdentityPort: {
      find: async (clientId) =>
        clients.find((client) => client.clientId === clientId) ?? null,
    },
    programStorePort: {
      findByClientId: async (clientId) =>
        programs.find((program) => program.clientId === clientId) ?? null,
      saveDraft: async (write) => {
        writes.push(write);

        return storeOutcome;
      },
    },
    clockPort: { now: () => NOW },
  });

  return { saveProgramDraftUseCase, writes };
}

const COMMAND = {
  clientId: CLIENT_ID,
  content: EDITED_CONTENT,
  level: "intermediate",
  language: "ro",
  expectedUpdatedAt: CREATED,
} as const;

describe("SaveProgramDraftUseCase", () => {
  it("saves the draft with its level and language while the copy is the stored one, and answers when it was saved", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes } = saveDraft();

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "saved", updatedAt: NOW });
    expect(writes).toHaveLength(1);
    expect(writes[0].expectedUpdatedAt).toEqual(CREATED);
    expect(writes[0].program.toSnapshot()).toMatchObject({
      level: "intermediate",
      language: "ro",
      updatedAt: NOW,
      versions: [{ number: 1, content: EDITED_CONTENT, updatedAt: NOW }],
    });
  });

  it("answers that the draft changed elsewhere when the store holds a newer copy", async () => {
    // arrange
    const { saveProgramDraftUseCase } = saveDraft({
      storeOutcome: "changed-elsewhere",
    });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "changed-elsewhere" });
  });

  it("refuses a program that holds no draft and writes nothing", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes } = saveDraft({
      programs: [anasProgram([{ ...DRAFT_VERSION, status: "published" }])],
    });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "not-a-draft" });
    expect(writes).toEqual([]);
  });

  it("refuses content that is not well formed and writes nothing", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes } = saveDraft();
    const twoWeekDeload: ProgramContent = {
      ...EDITED_CONTENT,
      plan: {
        blocks: [
          {
            id: "block-1",
            originId: "block-1",
            type: "deload",
            weeks: 2,
            trainingDays: 2,
            calibrationWeek: false,
            introText: "",
            clientNote: "",
            split: { shape: "full-body", name: "", text: "" },
            targetMinutes: 45,
            calendar: {
              mon: { kind: "rest" },
              tue: { kind: "rest" },
              wed: { kind: "rest" },
              thu: { kind: "rest" },
              fri: { kind: "rest" },
              sat: { kind: "rest" },
              sun: { kind: "rest" },
            },
            sessions: [],
            cardioSessions: [],
            dailySteps: 6000,
            missedDayNote: "",
          },
        ],
      },
    };

    // act
    const result = await saveProgramDraftUseCase.execute({
      ...COMMAND,
      content: twoWeekDeload,
    });

    // assert
    expect(result).toEqual({ status: "not-well-formed" });
    expect(writes).toEqual([]);
  });

  it("says she has no program yet", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes } = saveDraft({ programs: [] });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "no-program" });
    expect(writes).toEqual([]);
  });

  it("does not know a client no one paid for", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes } = saveDraft({ clients: [] });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "unknown-client" });
    expect(writes).toEqual([]);
  });
});
