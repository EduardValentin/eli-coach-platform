import type {
  DraftSummary,
  ProgramCardReading,
  ProgramSetupReading,
  ReadProgramCardUseCase,
  ReadProgramSetupUseCase,
  StartProgramResult,
  StartProgramUseCase,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

import { CoachProgramController } from "./coach-program-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const CLIENT_PAGE = `/coach/clients/${CLIENT_ID}`;

const COACH: SessionAccount = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { ...COACH, role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const ANA = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  gender: "female",
} as const;

const DRAFT: DraftSummary = {
  versionNumber: 1,
  blocks: [
    { type: "foundation", weeks: 4, filledSessions: 0, sessions: 3 },
    { type: "deload", weeks: 1, filledSessions: 1, sessions: 1 },
  ],
  stillMissing: [{ kind: "sessions-without-exercises", count: 3 }],
};

const DRAFT_BLOCKS = [
  {
    type: "foundation",
    typeLabel: "Foundation",
    weeks: 4,
    filledSessions: 0,
    sessions: 3,
  },
  {
    type: "deload",
    typeLabel: "Deload",
    weeks: 1,
    filledSessions: 1,
    sessions: 1,
  },
];

const SETUP = {
  goal: "Build muscle",
  level: "beginner",
  trainingDays: 3,
  sessionMinutes: 60,
  language: "en",
  dailySteps: 6000,
  splitShape: "full-body",
  equipment: ["Dumbbells"],
} as const;

const READY_SETUP: ProgramSetupReading = {
  status: "ready",
  client: ANA,
  startingValues: SETUP,
  goalOptions: ["Build muscle", "A goal without a coach label"],
  equipmentOptions: [
    { value: "Dumbbells", exclusive: false },
    { value: "Bodyweight only", exclusive: true },
  ],
  splitShapeByTrainingDays: {
    2: "full-body",
    3: "full-body",
    4: "upper-lower",
    5: "upper-lower",
  },
};

describe("CoachProgramController loadCard", () => {
  it.each([
    ["waiting", "waiting"],
    ["ready-to-build", "ready-to-build"],
    ["coaching-ended", "coaching-ended"],
  ] as const)(
    "answers the %s card with her gender",
    async (status, expectedState) => {
      // arrange
      const { coachProgramController } = createController({
        card: { status, gender: "male" },
      });

      // act
      const card = await coachProgramController.loadCard(
        coachArgs(),
        CLIENT_ID,
      );

      // assert
      expect(card).toEqual({ state: expectedState, gender: "male" });
    },
  );

  it("summarises her draft with its labelled blocks and what is still missing", async () => {
    // arrange
    const { coachProgramController, readProgramCard } = createController({
      card: {
        status: "program",
        gender: "female",
        coachingEnded: false,
        draft: DRAFT,
      },
    });

    // act
    const card = await coachProgramController.loadCard(coachArgs(), CLIENT_ID);

    // assert
    expect(card).toEqual({
      state: "draft",
      gender: "female",
      draft: { versionNumber: 1, blocks: DRAFT_BLOCKS },
      stillMissing: ["3 sessions without exercises"],
    });
    expect(readProgramCard).toHaveBeenCalledWith({ clientId: CLIENT_ID });
  });

  it("names a single session without exercises in the singular", async () => {
    // arrange
    const { coachProgramController } = createController({
      card: {
        status: "program",
        gender: "female",
        coachingEnded: false,
        draft: {
          ...DRAFT,
          stillMissing: [{ kind: "sessions-without-exercises", count: 1 }],
        },
      },
    });

    // act
    const card = await coachProgramController.loadCard(coachArgs(), CLIENT_ID);

    // assert
    expect(card).toMatchObject({
      stillMissing: ["1 session without exercises"],
    });
  });

  it("summarises her draft without what is still missing once her coaching has ended", async () => {
    // arrange
    const { coachProgramController } = createController({
      card: {
        status: "program",
        gender: "female",
        coachingEnded: true,
        draft: DRAFT,
      },
    });

    // act
    const card = await coachProgramController.loadCard(coachArgs(), CLIENT_ID);

    // assert
    expect(card).toEqual({
      state: "draft-coaching-ended",
      gender: "female",
      draft: { versionNumber: 1, blocks: DRAFT_BLOCKS },
    });
  });

  it("fails loudly for a program without a draft, which has no card before publishing exists", async () => {
    // arrange
    const { coachProgramController } = createController({
      card: {
        status: "program",
        gender: "female",
        coachingEnded: false,
        draft: null,
      },
    });

    // act
    const loading = coachProgramController.loadCard(coachArgs(), CLIENT_ID);

    // assert
    await expect(loading).rejects.toThrow(
      "The program has no draft to show on the card.",
    );
  });

  it("answers not found for a client it does not know", async () => {
    // arrange
    const { coachProgramController } = createController({
      card: { status: "unknown-client" },
    });

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.loadCard(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found for an address that holds no client id, without reading", async () => {
    // arrange
    const { coachProgramController, readProgramCard } = createController();

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.loadCard(coachArgs(), "not-a-client"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readProgramCard).not.toHaveBeenCalled();
  });

  it("refuses a client and sends an anonymous visitor to sign in, without reading", async () => {
    // arrange
    const { coachProgramController, readProgramCard } = createController();

    // act
    const refused = await captureThrown(() =>
      coachProgramController.loadCard(
        coachArgs({ session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );
    const sentToSignIn = await captureThrown(() =>
      coachProgramController.loadCard(
        coachArgs({ session: ANONYMOUS_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((refused as Response).status).toBe(403);
    expect((sentToSignIn as Response).status).toBe(302);
    expect(readProgramCard).not.toHaveBeenCalled();
  });
});

describe("CoachProgramController loadSetup", () => {
  it("answers the setup with her starting values and every choice the form offers", async () => {
    // arrange
    const { coachProgramController, readProgramSetup } = createController({
      setup: READY_SETUP,
    });

    // act
    const setup = await coachProgramController.loadSetup(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(setup).toEqual({
      state: "ready",
      client: ANA,
      startingValues: SETUP,
      choices: {
        goals: [
          { value: "Build muscle", label: "Muscle gain" },
          {
            value: "A goal without a coach label",
            label: "A goal without a coach label",
          },
        ],
        equipment: [
          { value: "Dumbbells", exclusive: false },
          { value: "Bodyweight only", exclusive: true },
        ],
        levels: [
          { value: "beginner", label: "Beginner" },
          { value: "intermediate", label: "Intermediate" },
          { value: "advanced", label: "Advanced" },
        ],
        trainingDays: [
          { value: 2, label: "2 days", splitShape: "full-body" },
          { value: 3, label: "3 days", splitShape: "full-body" },
          { value: 4, label: "4 days", splitShape: "upper-lower" },
          { value: 5, label: "5+ days", splitShape: "upper-lower" },
        ],
        splitShapes: [
          { value: "full-body", label: "Full Body" },
          { value: "upper-lower", label: "Upper / Lower" },
        ],
        sessionMinutes: [
          { value: 30, label: "30 min" },
          { value: 45, label: "45 min" },
          { value: 60, label: "60 min" },
        ],
        dailySteps: expect.arrayContaining([
          { value: 4000, label: "4,000" },
          { value: 12000, label: "12,000" },
        ]),
        languages: [
          { value: "en", label: "English" },
          { value: "ro", label: "Romanian" },
        ],
      },
    });
    expect(readProgramSetup).toHaveBeenCalledWith({ clientId: CLIENT_ID });
  });

  it("answers the not-ready setup, naming her, before her answers are approved", async () => {
    // arrange
    const { coachProgramController } = createController({
      setup: { status: "not-approved", client: ANA },
    });

    // act
    const setup = await coachProgramController.loadSetup(
      coachArgs(),
      CLIENT_ID,
    );

    // assert
    expect(setup).toEqual({ state: "not-ready", client: ANA });
  });

  it.each(["has-program", "coaching-ended"] as const)(
    "sends the coach back to her page when the setup reads %s",
    async (status) => {
      // arrange
      const { coachProgramController } = createController({
        setup: { status },
      });

      // act
      const thrown = await captureThrown(() =>
        coachProgramController.loadSetup(coachArgs(), CLIENT_ID),
      );

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(CLIENT_PAGE);
    },
  );

  it("answers not found for a client it does not know", async () => {
    // arrange
    const { coachProgramController } = createController({
      setup: { status: "unknown-client" },
    });

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.loadSetup(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses a client without reading the setup", async () => {
    // arrange
    const { coachProgramController, readProgramSetup } = createController();

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.loadSetup(
        coachArgs({ session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readProgramSetup).not.toHaveBeenCalled();
  });
});

describe("CoachProgramController create", () => {
  it("starts her program for the coach inside one unit of work and sends the coach to her page", async () => {
    // arrange
    const { coachProgramController, startProgram, unitOfWork } =
      createController({ start: { status: "started" } });

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.create(createArgs(SETUP), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(CLIENT_PAGE);
    expect(unitOfWork).toHaveBeenCalledOnce();
    expect(startProgram).toHaveBeenCalledWith({
      coachAccountId: COACH.id,
      clientId: CLIENT_ID,
      setup: SETUP,
    });
  });

  it("answers the problems at goal and equipment as data", async () => {
    // arrange
    const problems = { goal: "missing", equipment: "exclusive" } as const;
    const { coachProgramController } = createController({
      start: { status: "invalid", problems },
    });

    // act
    const outcome = await coachProgramController.create(
      createArgs(SETUP),
      CLIENT_ID,
    );

    // assert
    expect(outcome).toEqual({ status: "invalid", problems });
  });

  it.each([
    ["has-program", CLIENT_PAGE],
    ["coaching-ended", CLIENT_PAGE],
    ["not-approved", `${CLIENT_PAGE}/program/new`],
  ] as const)(
    "sends the coach on when the start is refused as %s, since trying again cannot work",
    async (status, location) => {
      // arrange
      const { coachProgramController, programStartFailed } = createController({
        start: { status },
      });

      // act
      const thrown = await captureThrown(() =>
        coachProgramController.create(createArgs(SETUP), CLIENT_ID),
      );

      // assert
      expect((thrown as Response).status).toBe(302);
      expect((thrown as Response).headers.get("Location")).toBe(location);
      expect(programStartFailed).not.toHaveBeenCalled();
    },
  );

  it("answers a failed save as data and records one incident when the start throws", async () => {
    // arrange
    const failure = new Error(
      "The client's equipment was not saved: changed-meanwhile.",
    );
    const { coachProgramController, startProgram, programStartFailed } =
      createController();
    startProgram.mockRejectedValue(failure);

    // act
    const outcome = await coachProgramController.create(
      createArgs(SETUP),
      CLIENT_ID,
    );

    // assert
    expect(outcome).toEqual({ status: "failed" });
    expect(programStartFailed).toHaveBeenCalledOnce();
    expect(programStartFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: failure,
    });
  });

  it("answers a failed save as data and records one incident when the unit of work cannot commit the start", async () => {
    // arrange
    const failure = new Error("commit failed");
    const { coachProgramController, unitOfWork, programStartFailed } =
      createController();
    unitOfWork.mockImplementation(async (work) => {
      await work();
      throw failure;
    });

    // act
    const outcome = await coachProgramController.create(
      createArgs(SETUP),
      CLIENT_ID,
    );

    // assert
    expect(outcome).toEqual({ status: "failed" });
    expect(programStartFailed).toHaveBeenCalledOnce();
    expect(programStartFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: failure,
    });
  });

  it("answers a failed save as data and records one incident when the unit of work cannot begin", async () => {
    // arrange
    const failure = new Error("database unreachable");
    const { coachProgramController, unitOfWork, programStartFailed } =
      createController();
    unitOfWork.mockRejectedValue(failure);

    // act
    const outcome = await coachProgramController.create(
      createArgs(SETUP),
      CLIENT_ID,
    );

    // assert
    expect(outcome).toEqual({ status: "failed" });
    expect(programStartFailed).toHaveBeenCalledOnce();
    expect(programStartFailed).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      error: failure,
    });
  });

  it("answers not found for a client it does not know", async () => {
    // arrange
    const { coachProgramController } = createController({
      start: { status: "unknown-client" },
    });

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.create(createArgs(SETUP), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers a bad request for a setup it cannot read, without starting", async () => {
    // arrange
    const { coachProgramController, startProgram } = createController();

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.create(
        createArgs({ ...SETUP, dailySteps: 6500 }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(400);
    expect(startProgram).not.toHaveBeenCalled();
  });

  it("refuses a client without starting", async () => {
    // arrange
    const { coachProgramController, startProgram } = createController();

    // act
    const thrown = await captureThrown(() =>
      coachProgramController.create(
        createArgs(SETUP, { session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(startProgram).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    card?: ProgramCardReading;
    setup?: ProgramSetupReading;
    start?: StartProgramResult;
  } = {},
) {
  const readProgramCard = vi
    .fn()
    .mockResolvedValue(options.card ?? { status: "unknown-client" });
  const readProgramSetup = vi
    .fn()
    .mockResolvedValue(options.setup ?? { status: "unknown-client" });
  const startProgram = vi
    .fn()
    .mockResolvedValue(options.start ?? { status: "started" });
  const unitOfWork = vi.fn((work: () => Promise<unknown>) => work());
  const programStartFailed = vi.fn();
  const coachProgramController = new CoachProgramController({
    readProgramCardUseCase: {
      execute: readProgramCard,
    } as unknown as ReadProgramCardUseCase,
    readProgramSetupUseCase: {
      execute: readProgramSetup,
    } as unknown as ReadProgramSetupUseCase,
    startProgramUseCase: {
      execute: startProgram,
    } as unknown as StartProgramUseCase,
    unitOfWork: unitOfWork as UnitOfWork,
    programIncidentsPort: { programStartFailed },
  });

  return {
    coachProgramController,
    readProgramCard,
    readProgramSetup,
    startProgram,
    unitOfWork,
    programStartFailed,
  };
}

function coachArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    ...sessionAccess(options.session),
    request: new Request(`https://evoa.fit${CLIENT_PAGE}`),
  });
}

function createArgs(
  body: unknown,
  options: { session?: ResolvedSession } = {},
) {
  return createRequestArgs({
    ...sessionAccess(options.session),
    request: new Request(`https://evoa.fit${CLIENT_PAGE}/program/new`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function sessionAccess(session?: ResolvedSession) {
  return {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
    session: session ?? { account: COACH, kind: "authenticated" },
  };
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
