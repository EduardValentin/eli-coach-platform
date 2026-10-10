import {
  CheckIn,
  type ClientCheckInScheduling,
  type ListCoachCheckInsUseCase,
  type ReadClientCheckInSchedulingUseCase,
  type ScheduleCheckInResult,
  type ScheduleCheckInUseCase,
} from "@eli-coach-platform/domain/check-in";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { CoachCheckInsController } from "./coach-check-ins-controller.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const NOW = new Date("2026-10-19T08:00:00.000Z");

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const PENDING = CheckIn.reconstitute({
  id: CHECK_IN_ID,
  clientId: CLIENT_ID,
  startsAt: new Date("2026-10-22T14:00:00.000Z"),
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: NOW,
  answeredAt: null,
});

describe("CoachCheckInsController loadCheckIns", () => {
  it("hands the coach every check-in with the client's name", async () => {
    // arrange
    const { controller } = createController({
      listed: [
        {
          ...PENDING.viewFor({ party: "coach", at: NOW }),
          client: { firstName: "Ana", lastName: "Popescu" },
        },
      ],
    });

    // act
    const listing = await controller.loadCheckIns(coachArgs());

    // assert
    expect(listing).toEqual({
      checkIns: [
        {
          id: CHECK_IN_ID,
          kind: "ad_hoc",
          status: "pending",
          initiatedBy: "client",
          awaitsViewer: true,
          viewerMayWithdraw: false,
          isWaitingRequest: true,
          startsAt: "2026-10-22T14:00:00.000Z",
          endsAt: "2026-10-22T15:00:00.000Z",
          joinEmphasisFrom: "2026-10-22T13:50:00.000Z",
          note: null,
          client: { firstName: "Ana", lastName: "Popescu" },
        },
      ],
    });
  });

  it("refuses a client without listing anything", async () => {
    // arrange
    const { controller, listCoachCheckIns } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadCheckIns(coachArgs({ session: CLIENT_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(listCoachCheckIns).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInsController schedule", () => {
  it("schedules the check-in for the client at the chosen instant with the coach's note", async () => {
    // arrange
    const { controller, scheduleCheckIn } = createController({
      scheduled: { status: "scheduled", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.schedule(
      coachArgs({
        body: {
          clientId: CLIENT_ID,
          startsAt: "2026-10-22T14:00:00.000Z",
          note: "Let's review your first month.",
        },
      }),
    );

    // assert
    expect(scheduleCheckIn).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      startsAt: new Date("2026-10-22T14:00:00.000Z"),
      note: "Let's review your first month.",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      status: "scheduled",
      checkInId: CHECK_IN_ID,
    });
  });

  it("schedules without a note when the coach wrote none", async () => {
    // arrange
    const { controller, scheduleCheckIn } = createController({
      scheduled: { status: "scheduled", checkIn: PENDING.toSnapshot() },
    });

    // act
    await controller.schedule(
      coachArgs({
        body: { clientId: CLIENT_ID, startsAt: "2026-10-22T14:00:00.000Z" },
      }),
    );

    // assert
    expect(scheduleCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ note: null }),
    );
  });

  it.each<{ result: ScheduleCheckInResult; status: number; error: string }>([
    {
      result: { status: "client_cannot_answer" },
      status: 409,
      error: "client_cannot_answer",
    },
    { result: { status: "time_taken" }, status: 409, error: "time_taken" },
    {
      result: { status: "note_too_long" },
      status: 422,
      error: "note_too_long",
    },
    {
      result: { status: "invalid_time_zone" },
      status: 422,
      error: "invalid_time_zone",
    },
  ])(
    "answers $status $error when scheduling is refused as $result.status",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ scheduled: result });

      // act
      const response = await controller.schedule(
        coachArgs({
          body: { clientId: CLIENT_ID, startsAt: "2026-10-22T14:00:00.000Z" },
        }),
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );

  it("answers not found for a client with no record", async () => {
    // arrange
    const { controller } = createController({
      scheduled: { status: "unknown_client" },
    });

    // act
    const response = await controller.schedule(
      coachArgs({
        body: { clientId: CLIENT_ID, startsAt: "2026-10-22T14:00:00.000Z" },
      }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it.each([
    [
      "a client id that is not a uuid",
      { clientId: "ana", startsAt: "2026-10-22T14:00:00.000Z" },
    ],
    [
      "a time that is not an instant",
      { clientId: CLIENT_ID, startsAt: "Thursday" },
    ],
  ])("refuses %s without scheduling anything", async (_what, body) => {
    // arrange
    const { controller, scheduleCheckIn } = createController();

    // act
    const response = await controller.schedule(coachArgs({ body }));

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(scheduleCheckIn).not.toHaveBeenCalled();
  });

  it("refuses a client without scheduling anything", async () => {
    // arrange
    const { controller, scheduleCheckIn } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.schedule(
        coachArgs({
          session: CLIENT_SESSION,
          body: { clientId: CLIENT_ID, startsAt: "2026-10-22T14:00:00.000Z" },
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(scheduleCheckIn).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInsController loadClientScheduling", () => {
  it.each(["allowed", "awaiting_onboarding", "ended"] as const)(
    "hands the coach the client's scheduling state %s",
    async (scheduling) => {
      // arrange
      const { controller, readClientCheckInScheduling } = createController({
        scheduling,
      });

      // act
      const read = await controller.loadClientScheduling(
        coachArgs(),
        CLIENT_ID,
      );

      // assert
      expect(read).toBe(scheduling);
      expect(readClientCheckInScheduling).toHaveBeenCalledWith(CLIENT_ID);
    },
  );

  it("answers not found for a client with no record", async () => {
    // arrange
    const { controller } = createController({ scheduling: "unknown" });

    // act
    const thrown = await captureThrown(() =>
      controller.loadClientScheduling(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found for a client id that is not a uuid without reading", async () => {
    // arrange
    const { controller, readClientCheckInScheduling } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadClientScheduling(coachArgs(), "ana"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readClientCheckInScheduling).not.toHaveBeenCalled();
  });

  it("refuses a client without reading", async () => {
    // arrange
    const { controller, readClientCheckInScheduling } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadClientScheduling(
        coachArgs({ session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientCheckInScheduling).not.toHaveBeenCalled();
  });
});

function createController(
  answers: {
    listed?: Awaited<ReturnType<ListCoachCheckInsUseCase["execute"]>>;
    scheduled?: ScheduleCheckInResult;
    scheduling?: ClientCheckInScheduling;
  } = {},
) {
  const listCoachCheckIns = vi.fn().mockResolvedValue(answers.listed ?? []);
  const scheduleCheckIn = vi
    .fn()
    .mockResolvedValue(answers.scheduled ?? { status: "unknown_client" });
  const readClientCheckInScheduling = vi
    .fn()
    .mockResolvedValue(answers.scheduling ?? "allowed");
  const controller = new CoachCheckInsController({
    listCoachCheckIns: {
      execute: listCoachCheckIns,
    } as unknown as ListCoachCheckInsUseCase,
    readClientCheckInScheduling: {
      execute: readClientCheckInScheduling,
    } as unknown as ReadClientCheckInSchedulingUseCase,
    scheduleCheckIn: {
      execute: scheduleCheckIn,
    } as unknown as ScheduleCheckInUseCase,
  });

  return {
    controller,
    listCoachCheckIns,
    readClientCheckInScheduling,
    scheduleCheckIn,
  };
}

function coachArgs(
  options: { session?: ResolvedSession; body?: Record<string, unknown> } = {},
) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, options.session ?? COACH_SESSION),
    ],
    request: new Request("https://evoa.fit/api/check-ins/schedule", {
      body: options.body ? JSON.stringify(options.body) : null,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
