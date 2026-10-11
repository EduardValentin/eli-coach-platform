import {
  CheckIn,
  type ApproveCheckInResult,
  type ApproveCheckInUseCase,
  type DeclineCheckInUseCase,
  type ListOpenCheckInTimesUseCase,
  type WithdrawCheckInRequestResult,
  type WithdrawCheckInRequestUseCase,
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

import { SharedCheckInsController } from "./shared-check-ins-controller.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
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
});

describe("SharedCheckInsController listOpenTimes", () => {
  it.each([
    ["the client", CLIENT_SESSION],
    ["the coach", COACH_SESSION],
  ])(
    "answers %s the open times as instants, never cached",
    async (_who, session) => {
      // arrange
      const { controller } = createController({
        openTimes: [STARTS_AT, new Date("2026-10-22T15:00:00.000Z")],
      });

      // act
      const response = await controller.listOpenTimes(argsFor({ session }));

      // assert
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        times: ["2026-10-22T14:00:00.000Z", "2026-10-22T15:00:00.000Z"],
      });
    },
  );

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
    openTimes?: Date[];
    approved?: ApproveCheckInResult;
    declined?: Awaited<ReturnType<DeclineCheckInUseCase["execute"]>>;
    withdrawn?: WithdrawCheckInRequestResult;
  } = {},
) {
  const listOpenCheckInTimes = vi
    .fn()
    .mockResolvedValue(answers.openTimes ?? []);
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
    declineCheckIn: {
      execute: declineCheckIn,
    } as unknown as DeclineCheckInUseCase,
    listOpenCheckInTimes: {
      execute: listOpenCheckInTimes,
    } as unknown as ListOpenCheckInTimesUseCase,
    withdrawCheckInRequest: {
      execute: withdrawCheckInRequest,
    } as unknown as WithdrawCheckInRequestUseCase,
  });

  return {
    controller,
    approveCheckIn,
    declineCheckIn,
    listOpenCheckInTimes,
    withdrawCheckInRequest,
  };
}

function argsFor(options: {
  session: ResolvedSession;
  body?: Record<string, unknown>;
  rawBody?: string;
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
    request: new Request("https://evoa.fit/api/check-ins", {
      body,
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
