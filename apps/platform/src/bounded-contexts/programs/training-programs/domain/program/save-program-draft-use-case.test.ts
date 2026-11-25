import { describe, expect, it, vi } from "vitest";

import type { ClientIdentity } from "./client-identity-port";
import type {
  ExerciseUsagePort,
  VersionExerciseUsage,
} from "./exercise-usage-port";
import type { LibraryExercise } from "./library-exercise";
import { Program } from "./program";
import type { ExerciseRow, ProgramContent } from "./program-content";
import { ProgramSuggestions } from "./program-suggestions";
import type { DraftSaveOutcome, DraftWrite } from "./program-store-port";
import type { ProgramVersionSnapshot } from "./program-version";
import { SaveProgramDraftUseCase } from "./save-program-draft-use-case";

const CREATED = new Date("2026-11-20T09:00:00.000Z");
const NOW = new Date("2026-11-21T10:30:00.000Z");
const CLIENT_ID = "client-1";
const COACH_ACCOUNT_ID = "coach-account-1";

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

function libraryExercise(
  id: string,
  overrides: Partial<LibraryExercise> = {},
): LibraryExercise {
  return {
    id,
    name: id,
    type: "resistance",
    unit: "reps",
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

const HER_LIBRARY: LibraryExercise[] = [
  libraryExercise("bike", { type: "cardio", unit: "time" }),
  libraryExercise("squat"),
  libraryExercise("lunge", { archived: true }),
  libraryExercise("hips", { type: "mobility", unit: "time" }),
  libraryExercise("pigeon", { type: "stretching", unit: "time" }),
];

function row(exerciseId: string, substitutions: string[]): ExerciseRow {
  return {
    id: `row-${exerciseId}`,
    exerciseId,
    slot: "C",
    startSets: [],
    restSeconds: 60,
    lastSetTechnique: "none",
    substitutions,
    progression: { kind: "double" },
    cues: "",
    touched: [],
  };
}

function filledContent(): ProgramContent {
  let next = 0;
  const suggested = new ProgramSuggestions({
    libraryExercises: [HER_LIBRARY[0]],
    newId: () => `id-${(next += 1)}`,
  }).initialContent({
    level: "beginner",
    trainingDays: 3,
    sessionMinutes: 60,
    language: "en",
    dailySteps: 6000,
    splitShape: "full-body",
  });
  const [first, ...others] = suggested.plan.blocks;
  const [session, ...sessions] = first.sessions;

  return {
    ...suggested,
    plan: {
      blocks: [
        {
          ...first,
          sessions: [
            {
              ...session,
              rows: [row("squat", ["lunge"])],
              warmUp: {
                items: [{ id: "w1", exerciseId: "hips", sets: 1, seconds: 45 }],
              },
              coolDown: {
                enabled: false,
                items: [{ id: "c1", exerciseId: "pigeon", seconds: 30 }],
              },
            },
            ...sessions,
          ],
        },
        ...others,
      ],
    },
  };
}

class InMemoryExerciseUsageAdapter implements ExerciseUsagePort {
  readonly recorded: VersionExerciseUsage[] = [];

  async recordVersionUsage(usage: VersionExerciseUsage): Promise<void> {
    this.recorded.push(usage);
  }
}

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
  libraryExercises?: LibraryExercise[];
};

function saveDraft({
  clients = [ANA],
  programs = [anasProgram([DRAFT_VERSION])],
  storeOutcome = "saved",
  libraryExercises = HER_LIBRARY,
}: Arrangement = {}) {
  const writes: DraftWrite[] = [];
  const libraryExercisesPort = { listFor: vi.fn(async () => libraryExercises) };
  const exerciseUsagePort = new InMemoryExerciseUsageAdapter();
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
    libraryExercisesPort,
    exerciseUsagePort,
    clockPort: { now: () => NOW },
  });

  return {
    saveProgramDraftUseCase,
    writes,
    libraryExercisesPort,
    exerciseUsagePort,
  };
}

const COMMAND = {
  coachAccountId: COACH_ACCOUNT_ID,
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

  it("answers that the draft changed elsewhere when the store holds a newer copy, recording nothing", async () => {
    // arrange
    const { saveProgramDraftUseCase, exerciseUsagePort } = saveDraft({
      storeOutcome: "changed-elsewhere",
    });

    // act
    const result = await saveProgramDraftUseCase.execute({
      ...COMMAND,
      content: filledContent(),
    });

    // assert
    expect(result).toEqual({ status: "changed-elsewhere" });
    expect(exerciseUsagePort.recorded).toEqual([]);
  });

  it("records, for the coach, every exercise the saved draft uses under its version number, archived ones of hers included", async () => {
    // arrange
    const { saveProgramDraftUseCase, libraryExercisesPort, exerciseUsagePort } =
      saveDraft();

    // act
    const result = await saveProgramDraftUseCase.execute({
      ...COMMAND,
      content: filledContent(),
    });

    // assert
    expect(result).toEqual({ status: "saved", updatedAt: NOW });
    expect(libraryExercisesPort.listFor).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
    expect(exerciseUsagePort.recorded).toHaveLength(1);
    expect(exerciseUsagePort.recorded[0]).toMatchObject({
      coachAccountId: COACH_ACCOUNT_ID,
      programId: "program-1",
      versionNumber: 1,
    });
    expect([...exerciseUsagePort.recorded[0].exerciseIds].sort()).toEqual([
      "bike",
      "hips",
      "lunge",
      "pigeon",
      "squat",
    ]);
  });

  it("records an empty set when the saved draft uses no exercise any more", async () => {
    // arrange
    const { saveProgramDraftUseCase, exerciseUsagePort } = saveDraft();

    // act
    await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(exerciseUsagePort.recorded).toEqual([
      {
        coachAccountId: COACH_ACCOUNT_ID,
        programId: "program-1",
        versionNumber: 1,
        exerciseIds: [],
      },
    ]);
  });

  it.each([
    [
      "a switched-off cool-down's exercise outside her library",
      HER_LIBRARY.slice(0, 4),
    ],
    [
      "a substitution outside her library",
      HER_LIBRARY.filter(({ id }) => id !== "lunge"),
    ],
  ])(
    "refuses content naming %s as not well formed, writing and recording nothing",
    async (_case, libraryExercises) => {
      // arrange
      const { saveProgramDraftUseCase, writes, exerciseUsagePort } = saveDraft({
        libraryExercises,
      });

      // act
      const result = await saveProgramDraftUseCase.execute({
        ...COMMAND,
        content: filledContent(),
      });

      // assert
      expect(result).toEqual({ status: "not-well-formed" });
      expect(writes).toEqual([]);
      expect(exerciseUsagePort.recorded).toEqual([]);
    },
  );

  it("fails whole when the library cannot record what the saved draft uses, so the unit of work rolls the save back", async () => {
    // arrange
    const failure = new Error("usage refused");
    const { saveProgramDraftUseCase, exerciseUsagePort } = saveDraft();
    vi.spyOn(exerciseUsagePort, "recordVersionUsage").mockRejectedValue(
      failure,
    );

    // act
    const saved = saveProgramDraftUseCase.execute({
      ...COMMAND,
      content: filledContent(),
    });

    // assert
    await expect(saved).rejects.toBe(failure);
  });

  it("refuses a program that holds no draft and writes nothing", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes, exerciseUsagePort } = saveDraft({
      programs: [anasProgram([{ ...DRAFT_VERSION, status: "published" }])],
    });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "not-a-draft" });
    expect(writes).toEqual([]);
    expect(exerciseUsagePort.recorded).toEqual([]);
  });

  it("refuses content that is not well formed and writes nothing", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes, exerciseUsagePort } = saveDraft();
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
    expect(exerciseUsagePort.recorded).toEqual([]);
  });

  it("says she has no program yet", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes, exerciseUsagePort } = saveDraft({
      programs: [],
    });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "no-program" });
    expect(writes).toEqual([]);
    expect(exerciseUsagePort.recorded).toEqual([]);
  });

  it("does not know a client no one paid for", async () => {
    // arrange
    const { saveProgramDraftUseCase, writes, exerciseUsagePort } = saveDraft({
      clients: [],
    });

    // act
    const result = await saveProgramDraftUseCase.execute(COMMAND);

    // assert
    expect(result).toEqual({ status: "unknown-client" });
    expect(writes).toEqual([]);
    expect(exerciseUsagePort.recorded).toEqual([]);
  });
});
