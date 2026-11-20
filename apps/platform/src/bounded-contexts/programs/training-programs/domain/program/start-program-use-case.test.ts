import { describe, expect, it, vi } from "vitest";

import type { CardioExercise } from "./cardio-exercises-port";
import type {
  ClientCoaching,
  ClientCoachingPort,
  EquipmentUpdate,
} from "./client-coaching-port";
import { Program } from "./program";
import type { ProgramIncidentsPort } from "./program-incidents-port";
import type { ProgramSetupValues } from "./program-setup";
import type { ProgramAddition, ProgramStorePort } from "./program-store-port";
import {
  StartProgramUseCase,
  type StartProgramResult,
} from "./start-program-use-case";
import type { SplitShape, TrainingDays, Weekday } from "./vocabulary";

const NOW = new Date("2026-11-20T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
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
      goal: "Lose fat",
      level: "beginner",
      trainingDays: 3,
      sessionMinutes: 60,
      equipment: ["Dumbbells", "Resistance bands"],
    },
  },
  equipmentOptions: [
    { value: "Full gym", exclusive: false },
    { value: "Dumbbells", exclusive: false },
    { value: "Resistance bands", exclusive: false },
    { value: "Bodyweight only", exclusive: true },
  ],
  goalOptions: ["Lose fat", "Build muscle"],
};

const SETUP: ProgramSetupValues = {
  goal: "Lose fat",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Resistance bands", "Dumbbells"],
};

const BIKE: CardioExercise = { id: "bike", name: "Stationary bike" };

class InMemoryProgramStoreAdapter implements ProgramStorePort {
  readonly added: Program[] = [];

  constructor(private readonly programs: Program[] = []) {}

  async findByClientId(clientId: string): Promise<Program | null> {
    return (
      [...this.programs, ...this.added].find(
        (program) => program.clientId === clientId,
      ) ?? null
    );
  }

  async add(program: Program): Promise<ProgramAddition> {
    if (await this.findByClientId(program.clientId)) {
      return "client-has-program";
    }
    this.added.push(program);

    return "added";
  }
}

class InMemoryClientCoachingAdapter implements ClientCoachingPort {
  readonly savedEquipment: EquipmentUpdate[] = [];

  constructor(private readonly clients: ClientCoaching[]) {}

  async find(clientId: string): Promise<ClientCoaching | null> {
    return this.clients.find((client) => client.clientId === clientId) ?? null;
  }

  async saveEquipment(update: EquipmentUpdate): Promise<void> {
    this.savedEquipment.push(update);
  }
}

type Arrangement = {
  clients?: ClientCoaching[];
  programs?: Program[];
  cardioExercises?: CardioExercise[];
};

function startProgram({
  clients = [ANA],
  programs = [],
  cardioExercises = [],
}: Arrangement = {}) {
  let next = 0;
  const programStorePort = new InMemoryProgramStoreAdapter(programs);
  const clientCoachingPort = new InMemoryClientCoachingAdapter(clients);
  const cardioExercisesPort = { listFor: vi.fn(async () => cardioExercises) };
  const programIncidentsPort = {
    programStartFailed: vi.fn(),
  } satisfies ProgramIncidentsPort;
  const startProgramUseCase = new StartProgramUseCase({
    programStorePort,
    clientCoachingPort,
    cardioExercisesPort,
    programIdsPort: { generate: () => `id-${(next += 1)}` },
    clockPort: { now: () => NOW },
    programIncidentsPort,
  });

  return {
    startProgramUseCase,
    programStorePort,
    clientCoachingPort,
    cardioExercisesPort,
    programIncidentsPort,
  };
}

function existingProgram(): Program {
  return Program.reconstitute({
    id: "program-0",
    clientId: CLIENT_ID,
    goal: "Lose fat",
    level: "beginner",
    language: "en",
    createdAt: NOW,
    updatedAt: NOW,
    versions: [],
  });
}

function sessionDays(program: Program): Weekday[] {
  const [block] = program.toSnapshot().versions[0].content.plan.blocks;

  return (Object.keys(block.calendar) as Weekday[]).filter(
    (day) => block.calendar[day].kind === "session",
  );
}

describe("StartProgramUseCase", () => {
  it("saves her program with version 1 as a draft holding the suggested plan, under a new id and created now", async () => {
    // arrange
    const { startProgramUseCase, programStorePort } = startProgram();

    // act
    const result = await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, goal: "Build muscle", language: "ro" },
    });

    // assert
    expect(result).toEqual({ status: "started" });
    const [program] = programStorePort.added;
    const snapshot = program.toSnapshot();
    expect(snapshot).toMatchObject({
      id: "id-1",
      clientId: CLIENT_ID,
      goal: "Build muscle",
      level: "beginner",
      language: "ro",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(
      snapshot.versions.map(({ number, status, createdAt }) => ({
        number,
        status,
        createdAt,
      })),
    ).toEqual([{ number: 1, status: "draft", createdAt: NOW }]);
    expect(
      snapshot.versions[0].content.plan.blocks.map(({ type, weeks }) => ({
        type,
        weeks,
      })),
    ).toEqual([
      { type: "foundation", weeks: 4 },
      { type: "hypertrophy", weeks: 6 },
      { type: "deload", weeks: 1 },
    ]);
  });

  it.each([
    [
      "intermediate",
      [
        { type: "hypertrophy", weeks: 6, calibrationWeek: true },
        { type: "deload", weeks: 1, calibrationWeek: false },
        { type: "hypertrophy", weeks: 6, calibrationWeek: false },
      ],
    ],
    [
      "advanced",
      [
        { type: "hypertrophy", weeks: 5, calibrationWeek: true },
        { type: "deload", weeks: 1, calibrationWeek: false },
        { type: "strength", weeks: 4, calibrationWeek: false },
        { type: "deload", weeks: 1, calibrationWeek: false },
      ],
    ],
  ] as const)("suggests the plan of an %s client", async (level, expected) => {
    // arrange
    const { startProgramUseCase, programStorePort } = startProgram();

    // act
    await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, level },
    });

    // assert
    const [program] = programStorePort.added;
    expect(
      program
        .toSnapshot()
        .versions[0].content.plan.blocks.map(
          ({ type, weeks, calibrationWeek }) => ({
            type,
            weeks,
            calibrationWeek,
          }),
        ),
    ).toEqual(expected);
  });

  it.each([
    [2, "full-body", ["Full Body A", "Full Body B"], ["mon", "thu"]],
    [
      3,
      "full-body",
      ["Full Body A", "Full Body B", "Full Body C"],
      ["mon", "wed", "fri"],
    ],
    [
      4,
      "upper-lower",
      ["Lower A", "Upper A", "Lower B", "Upper B"],
      ["mon", "tue", "thu", "fri"],
    ],
    [
      5,
      "upper-lower",
      ["Lower A", "Upper A", "Lower B", "Upper B", "Lower C"],
      ["mon", "tue", "wed", "fri", "sat"],
    ],
  ] as const satisfies readonly (readonly [
    TrainingDays,
    SplitShape,
    readonly string[],
    readonly Weekday[],
  ])[])(
    "builds %i training days on the %s split and lays them out across the week",
    async (trainingDays, splitShape, names, days) => {
      // arrange
      const { startProgramUseCase, programStorePort } = startProgram();

      // act
      await startProgramUseCase.execute({
        coachAccountId: COACH_ACCOUNT_ID,
        clientId: CLIENT_ID,
        setup: { ...SETUP, trainingDays, splitShape },
      });

      // assert
      const [program] = programStorePort.added;
      const [block] = program.toSnapshot().versions[0].content.plan.blocks;
      expect(block.split.shape).toBe(splitShape);
      expect(block.sessions.map((session) => session.name)).toEqual(names);
      expect(sessionDays(program)).toEqual(days);
    },
  );

  it("builds the cardio sessions on a cardio exercise from the coach's library", async () => {
    // arrange
    const { startProgramUseCase, programStorePort, cardioExercisesPort } =
      startProgram({ cardioExercises: [BIKE] });

    // act
    await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: SETUP,
    });

    // assert
    expect(cardioExercisesPort.listFor).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
    const [program] = programStorePort.added;
    const [block] = program.toSnapshot().versions[0].content.plan.blocks;
    expect(
      block.cardioSessions.flatMap((cardio) =>
        cardio.segments.map((segment) => segment.exerciseId),
      ),
    ).toEqual(["bike", "bike"]);
  });

  it("builds the cardio sessions without an exercise when the coach has no cardio exercise", async () => {
    // arrange
    const { startProgramUseCase, programStorePort } = startProgram();

    // act
    await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: SETUP,
    });

    // assert
    const [program] = programStorePort.added;
    const [block] = program.toSnapshot().versions[0].content.plan.blocks;
    expect(block.cardioSessions.map((cardio) => cardio.name)).toEqual([
      "Easy cardio",
      "Easy cardio",
    ]);
    expect(
      block.cardioSessions.flatMap((cardio) =>
        cardio.segments.map((segment) => segment.exerciseId),
      ),
    ).toEqual(["", ""]);
  });

  it.each<[StartProgramResult["status"], Arrangement]>([
    ["unknown-client", { clients: [] }],
    [
      "not-approved",
      { clients: [{ ...ANA, answers: { status: "not-approved" } }] },
    ],
    ["coaching-ended", { clients: [{ ...ANA, coachingEnded: true }] }],
    ["has-program", { programs: [existingProgram()] }],
  ])("refuses with %s and writes nothing", async (status, arrangement) => {
    // arrange
    const { startProgramUseCase, programStorePort, clientCoachingPort } =
      startProgram(arrangement);

    // act
    const result = await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, equipment: ["Full gym"] },
    });

    // assert
    expect(result).toEqual({ status });
    expect(programStorePort.added).toEqual([]);
    expect(clientCoachingPort.savedEquipment).toEqual([]);
  });

  it("refuses a setup without a goal or without equipment, naming each problem, and writes nothing", async () => {
    // arrange
    const { startProgramUseCase, programStorePort, clientCoachingPort } =
      startProgram();

    // act
    const results = [
      await startProgramUseCase.execute({
        coachAccountId: COACH_ACCOUNT_ID,
        clientId: CLIENT_ID,
        setup: { ...SETUP, goal: "  " },
      }),
      await startProgramUseCase.execute({
        coachAccountId: COACH_ACCOUNT_ID,
        clientId: CLIENT_ID,
        setup: { ...SETUP, equipment: [] },
      }),
    ];

    // assert
    expect(results).toEqual([
      { status: "invalid", problems: { goal: "missing" } },
      { status: "invalid", problems: { equipment: "missing" } },
    ]);
    expect(programStorePort.added).toEqual([]);
    expect(clientCoachingPort.savedEquipment).toEqual([]);
  });

  it("refuses a goal that is not among her goal options and writes nothing", async () => {
    // arrange
    const { startProgramUseCase, programStorePort, clientCoachingPort } =
      startProgram();

    // act
    const result = await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, goal: "Run a marathon", equipment: ["Full gym"] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { goal: "unknown" },
    });
    expect(programStorePort.added).toEqual([]);
    expect(clientCoachingPort.savedEquipment).toEqual([]);
  });

  it("saves changed equipment to her profile", async () => {
    // arrange
    const { startProgramUseCase, clientCoachingPort } = startProgram();

    // act
    await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, equipment: ["Full gym"] },
    });

    // assert
    expect(clientCoachingPort.savedEquipment).toEqual([
      { clientId: CLIENT_ID, equipment: ["Full gym"] },
    ]);
  });

  it("leaves her profile alone when the equipment is unchanged", async () => {
    // arrange
    const { startProgramUseCase, programStorePort, clientCoachingPort } =
      startProgram();

    // act
    await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, equipment: ["Resistance bands", "Dumbbells"] },
    });

    // assert
    expect(programStorePort.added).toHaveLength(1);
    expect(clientCoachingPort.savedEquipment).toEqual([]);
  });

  it("refuses with has-program and saves no equipment when another program for her lands first", async () => {
    // arrange
    const { startProgramUseCase, programStorePort, clientCoachingPort } =
      startProgram();
    vi.spyOn(programStorePort, "add").mockResolvedValue("client-has-program");

    // act
    const result = await startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, equipment: ["Full gym"] },
    });

    // assert
    expect(result).toEqual({ status: "has-program" });
    expect(clientCoachingPort.savedEquipment).toEqual([]);
  });

  it("writes the program and her equipment in one call, failing it whole when the equipment save fails so the unit of work rolls both back", async () => {
    // arrange
    const failure = new Error("profile write failed");
    const {
      startProgramUseCase,
      programStorePort,
      clientCoachingPort,
      programIncidentsPort,
    } = startProgram();
    vi.spyOn(clientCoachingPort, "saveEquipment").mockRejectedValue(failure);

    // act
    const started = startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: { ...SETUP, equipment: ["Full gym"] },
    });

    // assert
    await expect(started).rejects.toBe(failure);
    expect(programStorePort.added).toHaveLength(1);
    expect(programIncidentsPort.programStartFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: failure,
    });
  });

  it("records an incident and fails whole when the program cannot be saved", async () => {
    // arrange
    const failure = new Error("program write failed");
    const { startProgramUseCase, programStorePort, programIncidentsPort } =
      startProgram();
    vi.spyOn(programStorePort, "add").mockRejectedValue(failure);

    // act
    const started = startProgramUseCase.execute({
      coachAccountId: COACH_ACCOUNT_ID,
      clientId: CLIENT_ID,
      setup: SETUP,
    });

    // assert
    await expect(started).rejects.toBe(failure);
    expect(programIncidentsPort.programStartFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: failure,
    });
  });
});
