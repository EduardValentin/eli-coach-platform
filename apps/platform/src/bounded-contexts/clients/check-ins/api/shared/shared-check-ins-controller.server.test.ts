import {
  CheckIn,
  type ApproveCheckInResult,
  type ApproveCheckInUseCase,
  type CancelCheckInResult,
  type CancelCheckInUseCase,
  type DeclineCheckInUseCase,
  type ListOpenCheckInTimesResult,
  type ListOpenCheckInTimesUseCase,
  type ProposeCheckInTimeResult,
  type ProposeCheckInTimeUseCase,
  type WithdrawCheckInRequestResult,
  type WithdrawCheckInRequestUseCase,
} from "@eli-coach-platform/domain/check-in";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { SharedCheckInsController } from "./shared-check-ins-controller.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const NOW = new Date("2026-10-19T08:00:00.000Z");
const STARTS_AT = new Date("2026-10-22T14:00:00.000Z");

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const PENDING = CheckIn.reconstitute({
  id: CHECK_IN_ID,
  seriesId: null,
  clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "coach",
  proposedBy: "coach",
  note: null,
  requestedAt: NOW,
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
});

describe("SharedCheckInsController listOpenTimes", () => {
  it("answers the client her open times as instants, never cached", async () => {
    // arrange
    const { controller, listOpenCheckInTimes } = createController({
      openTimes: {
        status: "listed",
        times: [STARTS_AT, new Date("2026-10-22T15:00:00.000Z")],
      },
    });

    // act
    const response = await controller.listOpenTimes(
      argsFor({ session: CLIENT_SESSION }),
    );

    // assert
    expect(listOpenCheckInTimes).toHaveBeenCalledWith({
      actor: { party: "client", authSubjectId: "user_ana" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      times: ["2026-10-22T14:00:00.000Z", "2026-10-22T15:00:00.000Z"],
    });
  });

  it("ignores the client a client names", async () => {
    // arrange
    const { controller, listOpenCheckInTimes } = createController({
      openTimes: { status: "listed", times: [] },
    });

    // act
    await controller.listOpenTimes(
      argsFor({ session: CLIENT_SESSION, query: "?clientId=not-a-client" }),
    );

    // assert
    expect(listOpenCheckInTimes).toHaveBeenCalledWith({
      actor: { party: "client", authSubjectId: "user_ana" },
    });
  });

  it("lists the coach the open times of the client she names", async () => {
    // arrange
    const { controller, listOpenCheckInTimes } = createController({
      openTimes: { status: "listed", times: [STARTS_AT] },
    });

    // act
    const response = await controller.listOpenTimes(
      argsFor({ session: COACH_SESSION, query: `?clientId=${CLIENT_ID}` }),
    );

    // assert
    expect(listOpenCheckInTimes).toHaveBeenCalledWith({
      actor: { party: "coach" },
      clientId: CLIENT_ID,
    });
    expect(await response.json()).toEqual({
      times: ["2026-10-22T14:00:00.000Z"],
    });
  });

  it.each<{ result: ListOpenCheckInTimesResult; status: number }>([
    { result: { status: "client_required" }, status: 422 },
    { result: { status: "unknown_client" }, status: 404 },
    { result: { status: "ended" }, status: 409 },
  ])(
    "answers $status when the listing answers $result.status",
    async ({ result, status }) => {
      // arrange
      const { controller } = createController({ openTimes: result });

      // act
      const response = await controller.listOpenTimes(
        argsFor({ session: COACH_SESSION }),
      );

      // assert
      expect(response.status).toBe(status);
    },
  );

  it("answers not found when the coach names a client that is not an identifier, without listing", async () => {
    // arrange
    const { controller, listOpenCheckInTimes } = createController();

    // act
    const response = await controller.listOpenTimes(
      argsFor({ session: COACH_SESSION, query: "?clientId=../other" }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(listOpenCheckInTimes).not.toHaveBeenCalled();
  });

  it("answers 401 to a visitor who is not signed in without reading the times", async () => {
    // arrange
    const { controller, listOpenCheckInTimes } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.listOpenTimes(argsFor({ session: ANONYMOUS_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(listOpenCheckInTimes).not.toHaveBeenCalled();
  });
});

describe("SharedCheckInsController proposeNewTime", () => {
  it("proposes the client's new time with her note from the zone she names", async () => {
    // arrange
    const { controller, proposeCheckInTime } = createController({
      proposed: { status: "proposed", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.proposeNewTime(
      argsFor({
        session: CLIENT_SESSION,
        body: {
          startsAt: "2026-10-23T14:00:00.000Z",
          note: "Friday suits me better.",
          timeZone: "Asia/Tokyo",
        },
      }),
      CHECK_IN_ID,
    );

    // assert
    expect(proposeCheckInTime).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "client", authSubjectId: "user_ana" },
      startsAt: new Date("2026-10-23T14:00:00.000Z"),
      note: "Friday suits me better.",
      clientTimeZone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "proposed",
      checkInId: CHECK_IN_ID,
    });
  });

  it("proposes the coach's new time without a note when she wrote none", async () => {
    // arrange
    const { controller, proposeCheckInTime } = createController({
      proposed: { status: "proposed", checkIn: PENDING.toSnapshot() },
    });

    // act
    await controller.proposeNewTime(
      argsFor({
        session: COACH_SESSION,
        body: { startsAt: "2026-10-23T14:00:00.000Z" },
      }),
      CHECK_IN_ID,
    );

    // assert
    expect(proposeCheckInTime).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "coach" },
      startsAt: new Date("2026-10-23T14:00:00.000Z"),
      note: null,
    });
  });

  it.each<{ result: ProposeCheckInTimeResult; status: number; error: string }>([
    { result: { status: "time_taken" }, status: 409, error: "time_taken" },
    {
      result: { status: "moves_exhausted" },
      status: 409,
      error: "moves_exhausted",
    },
    {
      result: { status: "not_next_weekly" },
      status: 409,
      error: "not_next_weekly",
    },
    { result: { status: "not_pending" }, status: 409, error: "not_pending" },
    {
      result: { status: "changed_meanwhile" },
      status: 409,
      error: "not_pending",
    },
    { result: { status: "expired" }, status: 409, error: "not_pending" },
    {
      result: { status: "not_your_turn" },
      status: 409,
      error: "not_pending",
    },
    { result: { status: "ended" }, status: 409, error: "ended" },
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
    "answers $status $error when the new time is refused as $result.status",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ proposed: result });

      // act
      const response = await controller.proposeNewTime(
        argsFor({
          session: CLIENT_SESSION,
          body: { startsAt: "2026-10-23T14:00:00.000Z" },
        }),
        CHECK_IN_ID,
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );

  it("answers not found to a check-in the actor cannot reach", async () => {
    // arrange
    const { controller } = createController({
      proposed: { status: "unknown" },
    });

    // act
    const response = await controller.proposeNewTime(
      argsFor({
        session: CLIENT_SESSION,
        body: { startsAt: "2026-10-23T14:00:00.000Z" },
      }),
      CHECK_IN_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses a new time that is not an instant without proposing anything", async () => {
    // arrange
    const { controller, proposeCheckInTime } = createController();

    // act
    const response = await controller.proposeNewTime(
      argsFor({ session: COACH_SESSION, body: { startsAt: "next Friday" } }),
      CHECK_IN_ID,
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(proposeCheckInTime).not.toHaveBeenCalled();
  });

  it("answers not found to an id that is not a uuid without proposing anything", async () => {
    // arrange
    const { controller, proposeCheckInTime } = createController();

    // act
    const response = await controller.proposeNewTime(
      argsFor({
        session: COACH_SESSION,
        body: { startsAt: "2026-10-23T14:00:00.000Z" },
      }),
      "../other",
    );

    // assert
    expect(response.status).toBe(404);
    expect(proposeCheckInTime).not.toHaveBeenCalled();
  });
});

describe("SharedCheckInsController cancel", () => {
  it("cancels as the client from the zone her answer names", async () => {
    // arrange
    const { controller, cancelCheckIn } = createController({
      cancelled: { status: "cancelled", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.cancel(
      argsFor({ session: CLIENT_SESSION, body: { timeZone: "Asia/Tokyo" } }),
      CHECK_IN_ID,
    );

    // assert
    expect(cancelCheckIn).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "client", authSubjectId: "user_ana" },
      clientTimeZone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "cancelled",
      checkInId: CHECK_IN_ID,
    });
  });

  it.each<{ result: CancelCheckInResult; status: number; error: string }>([
    { result: { status: "not_approved" }, status: 409, error: "not_pending" },
    { result: { status: "expired" }, status: 409, error: "not_pending" },
    { result: { status: "not_allowed" }, status: 409, error: "not_pending" },
    {
      result: { status: "changed_meanwhile" },
      status: 409,
      error: "not_pending",
    },
    { result: { status: "ended" }, status: 409, error: "ended" },
  ])(
    "answers $status $error when the cancellation is refused as $result.status",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ cancelled: result });

      // act
      const response = await controller.cancel(
        argsFor({ session: COACH_SESSION }),
        CHECK_IN_ID,
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );
});

describe("SharedCheckInsController approve", () => {
  it("approves as the coach and hands the use case any zone the body names", async () => {
    // arrange
    const { controller, approveCheckIn } = createController({
      approved: { status: "approved", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.approve(
      argsFor({ session: COACH_SESSION, body: { timeZone: "Asia/Tokyo" } }),
      CHECK_IN_ID,
    );

    // assert
    expect(approveCheckIn).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "coach" },
      clientTimeZone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "approved",
      checkInId: CHECK_IN_ID,
    });
  });

  it("approves as the client from the zone her answer names", async () => {
    // arrange
    const { controller, approveCheckIn } = createController({
      approved: { status: "approved", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.approve(
      argsFor({ session: CLIENT_SESSION, body: { timeZone: "Asia/Tokyo" } }),
      CHECK_IN_ID,
    );

    // assert
    expect(approveCheckIn).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "client", authSubjectId: "user_ana" },
      clientTimeZone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
  });

  it("approves without a zone when the answer carries no body", async () => {
    // arrange
    const { controller, approveCheckIn } = createController({
      approved: { status: "approved", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.approve(
      argsFor({ session: COACH_SESSION }),
      CHECK_IN_ID,
    );

    // assert
    expect(approveCheckIn).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "coach" },
    });
    expect(response.status).toBe(200);
  });

  it.each<{ result: ApproveCheckInResult; status: number; error: string }>([
    { result: { status: "not_pending" }, status: 409, error: "not_pending" },
    {
      result: { status: "changed_meanwhile" },
      status: 409,
      error: "not_pending",
    },
    { result: { status: "expired" }, status: 409, error: "not_pending" },
    { result: { status: "not_your_turn" }, status: 409, error: "not_pending" },
    { result: { status: "ended" }, status: 409, error: "ended" },
    {
      result: { status: "invalid_time_zone" },
      status: 422,
      error: "invalid_time_zone",
    },
  ])(
    "answers $status $error when the approval is refused as $result.status",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ approved: result });

      // act
      const response = await controller.approve(
        argsFor({ session: CLIENT_SESSION }),
        CHECK_IN_ID,
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );

  it("answers not found to a check-in the actor cannot reach", async () => {
    // arrange
    const { controller } = createController({
      approved: { status: "unknown" },
    });

    // act
    const response = await controller.approve(
      argsFor({ session: CLIENT_SESSION }),
      CHECK_IN_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses a body that is not JSON without approving anything", async () => {
    // arrange
    const { controller, approveCheckIn } = createController();

    // act
    const response = await controller.approve(
      argsFor({ session: CLIENT_SESSION, rawBody: "{not json" }),
      CHECK_IN_ID,
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(approveCheckIn).not.toHaveBeenCalled();
  });

  it("answers not found to an id that is not a uuid without approving anything", async () => {
    // arrange
    const { controller, approveCheckIn } = createController();

    // act
    const response = await controller.approve(
      argsFor({ session: COACH_SESSION }),
      "../other",
    );

    // assert
    expect(response.status).toBe(404);
    expect(approveCheckIn).not.toHaveBeenCalled();
  });

  it("answers 401 to a visitor who is not signed in without approving anything", async () => {
    // arrange
    const { controller, approveCheckIn } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.approve(argsFor({ session: ANONYMOUS_SESSION }), CHECK_IN_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(401);
    expect(approveCheckIn).not.toHaveBeenCalled();
  });
});

describe("SharedCheckInsController decline", () => {
  it("declines as the client from the zone her answer names", async () => {
    // arrange
    const { controller, declineCheckIn } = createController({
      declined: { status: "declined", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.decline(
      argsFor({ session: CLIENT_SESSION, body: { timeZone: "Asia/Tokyo" } }),
      CHECK_IN_ID,
    );

    // assert
    expect(declineCheckIn).toHaveBeenCalledWith({
      checkInId: CHECK_IN_ID,
      actor: { party: "client", authSubjectId: "user_ana" },
      clientTimeZone: "Asia/Tokyo",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "declined",
      checkInId: CHECK_IN_ID,
    });
  });
});

describe("SharedCheckInsController withdraw", () => {
  it.each([
    [
      "the client",
      CLIENT_SESSION,
      { party: "client", authSubjectId: "user_ana" },
    ],
    ["the coach", COACH_SESSION, { party: "coach" }],
  ] as const)(
    "withdraws as %s and names the request in the answer",
    async (_who, session, actor) => {
      // arrange
      const { controller, withdrawCheckInRequest } = createController({
        withdrawn: { status: "withdrawn", checkIn: PENDING.toSnapshot() },
      });

      // act
      const response = await controller.withdraw(
        argsFor({ session }),
        CHECK_IN_ID,
      );

      // assert
      expect(withdrawCheckInRequest).toHaveBeenCalledWith({
        checkInId: CHECK_IN_ID,
        actor,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: "withdrawn",
        checkInId: CHECK_IN_ID,
      });
    },
  );

  it.each<{
    result: WithdrawCheckInRequestResult;
    status: number;
    error: string;
  }>([
    { result: { status: "not_your_turn" }, status: 409, error: "not_pending" },
    { result: { status: "ended" }, status: 409, error: "ended" },
  ])(
    "answers $status $error when the withdrawal is refused as $result.status",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ withdrawn: result });

      // act
      const response = await controller.withdraw(
        argsFor({ session: CLIENT_SESSION }),
        CHECK_IN_ID,
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );
});

function createController(
  answers: {
    openTimes?: ListOpenCheckInTimesResult;
    approved?: ApproveCheckInResult;
    cancelled?: CancelCheckInResult;
    declined?: Awaited<ReturnType<DeclineCheckInUseCase["execute"]>>;
    proposed?: ProposeCheckInTimeResult;
    withdrawn?: WithdrawCheckInRequestResult;
  } = {},
) {
  const listOpenCheckInTimes = vi
    .fn()
    .mockResolvedValue(answers.openTimes ?? { status: "listed", times: [] });
  const cancelCheckIn = vi
    .fn()
    .mockResolvedValue(answers.cancelled ?? { status: "unknown" });
  const proposeCheckInTime = vi
    .fn()
    .mockResolvedValue(answers.proposed ?? { status: "unknown" });
  const approveCheckIn = vi
    .fn()
    .mockResolvedValue(answers.approved ?? { status: "unknown" });
  const declineCheckIn = vi
    .fn()
    .mockResolvedValue(answers.declined ?? { status: "unknown" });
  const withdrawCheckInRequest = vi
    .fn()
    .mockResolvedValue(answers.withdrawn ?? { status: "unknown" });
  const controller = new SharedCheckInsController({
    approveCheckIn: {
      execute: approveCheckIn,
    } as unknown as ApproveCheckInUseCase,
    cancelCheckIn: {
      execute: cancelCheckIn,
    } as unknown as CancelCheckInUseCase,
    declineCheckIn: {
      execute: declineCheckIn,
    } as unknown as DeclineCheckInUseCase,
    listOpenCheckInTimes: {
      execute: listOpenCheckInTimes,
    } as unknown as ListOpenCheckInTimesUseCase,
    proposeCheckInTime: {
      execute: proposeCheckInTime,
    } as unknown as ProposeCheckInTimeUseCase,
    withdrawCheckInRequest: {
      execute: withdrawCheckInRequest,
    } as unknown as WithdrawCheckInRequestUseCase,
  });

  return {
    controller,
    approveCheckIn,
    cancelCheckIn,
    declineCheckIn,
    listOpenCheckInTimes,
    proposeCheckInTime,
    withdrawCheckInRequest,
  };
}

function argsFor(options: {
  session: ResolvedSession;
  body?: Record<string, unknown>;
  rawBody?: string;
  query?: string;
}) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;
  const body =
    options.rawBody ?? (options.body ? JSON.stringify(options.body) : null);

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(sessionContext, options.session),
    ],
    request: new Request(
      `https://evoa.fit/api/check-ins${options.query ?? ""}`,
      {
        body,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    ),
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
