import {
  CheckIn,
  type ListClientCheckInsUseCase,
  type RequestCheckInResult,
  type RequestCheckInUseCase,
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

import { ClientCheckInsController } from "./client-check-ins-controller.server";

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

const PENDING = CheckIn.reconstitute({
  id: CHECK_IN_ID,
  clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: "Can we talk about my knees?",
  requestedAt: NOW,
  answeredAt: null,
});

describe("ClientCheckInsController loadCheckIns", () => {
  it("hands the client her check-ins as instants with their status at the moment of reading", async () => {
    // arrange
    const { controller, listClientCheckIns } = createController({
      listed: {
        status: "listed",
        checkIns: [PENDING.viewFor({ party: "client", at: NOW })],
      },
    });

    // act
    const listing = await controller.loadCheckIns(clientArgs());

    // assert
    expect(listClientCheckIns).toHaveBeenCalledWith("user_ana");
    expect(listing).toEqual({
      checkIns: [
        {
          id: CHECK_IN_ID,
          kind: "ad_hoc",
          status: "pending",
          initiatedBy: "client",
          awaitsViewer: false,
          viewerMayWithdraw: true,
          isWaitingRequest: true,
          startsAt: "2026-10-22T14:00:00.000Z",
          endsAt: "2026-10-22T15:00:00.000Z",
          joinEmphasisFrom: "2026-10-22T13:50:00.000Z",
          note: "Can we talk about my knees?",
        },
      ],
    });
  });

  it("answers not found to a client whose portal is closed", async () => {
    // arrange
    const { controller } = createController({ listed: { status: "ended" } });

    // act
    const thrown = await captureThrown(() =>
      controller.loadCheckIns(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("refuses the coach without listing anything", async () => {
    // arrange
    const { controller, listClientCheckIns } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadCheckIns(clientArgs({ session: COACH_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(listClientCheckIns).not.toHaveBeenCalled();
  });
});

describe("ClientCheckInsController request", () => {
  it("asks for the check-in at the chosen instant in her zone with her note", async () => {
    // arrange
    const { controller, requestCheckIn } = createController({
      requested: { status: "requested", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.request(
      requestArgs({
        startsAt: STARTS_AT.toISOString(),
        timeZone: "Europe/London",
        note: "Can we talk about my knees?",
      }),
    );

    // assert
    expect(requestCheckIn).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      startsAt: STARTS_AT,
      clientTimeZone: "Europe/London",
      note: "Can we talk about my knees?",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      status: "requested",
      checkInId: CHECK_IN_ID,
    });
  });

  it("asks without a note when she wrote none", async () => {
    // arrange
    const { controller, requestCheckIn } = createController();

    // act
    await controller.request(
      requestArgs({
        startsAt: STARTS_AT.toISOString(),
        timeZone: "Europe/London",
      }),
    );

    // assert
    expect(requestCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ note: null }),
    );
  });

  it.each<{ result: RequestCheckInResult; status: number; error: string }>([
    {
      result: { status: "request_waiting" },
      status: 409,
      error: "request_waiting",
    },
    { result: { status: "time_taken" }, status: 409, error: "time_taken" },
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
    "answers $status $error when the request is refused as $error",
    async ({ result, status, error }) => {
      // arrange
      const { controller } = createController({ requested: result });

      // act
      const response = await controller.request(
        requestArgs({
          startsAt: STARTS_AT.toISOString(),
          timeZone: "Europe/London",
          note: null,
        }),
      );

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error });
    },
  );

  it.each([
    { body: "not json", what: "a body that is not JSON" },
    {
      body: JSON.stringify({ timeZone: "Europe/London" }),
      what: "a body without a time",
    },
    {
      body: JSON.stringify({ startsAt: "tomorrow", timeZone: "Europe/London" }),
      what: "a time that is not an instant",
    },
  ])("refuses $what without asking for anything", async ({ body }) => {
    // arrange
    const { controller, requestCheckIn } = createController();

    // act
    const response = await controller.request(rawRequestArgs(body));

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_request" });
    expect(requestCheckIn).not.toHaveBeenCalled();
  });

  it("refuses the coach without asking for anything", async () => {
    // arrange
    const { controller, requestCheckIn } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.request(
        requestArgs(
          { startsAt: STARTS_AT.toISOString(), timeZone: "Europe/London" },
          COACH_SESSION,
        ),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(requestCheckIn).not.toHaveBeenCalled();
  });
});

function createController(
  answers: {
    listed?: Awaited<ReturnType<ListClientCheckInsUseCase["execute"]>>;
    requested?: RequestCheckInResult;
  } = {},
) {
  const listClientCheckIns = vi
    .fn()
    .mockResolvedValue(answers.listed ?? { status: "listed", checkIns: [] });
  const requestCheckIn = vi.fn().mockResolvedValue(
    answers.requested ?? {
      status: "requested",
      checkIn: PENDING.toSnapshot(),
    },
  );
  const controller = new ClientCheckInsController({
    listClientCheckIns: {
      execute: listClientCheckIns,
    } as unknown as ListClientCheckInsUseCase,
    requestCheckIn: {
      execute: requestCheckIn,
    } as unknown as RequestCheckInUseCase,
  });

  return {
    controller,
    listClientCheckIns,
    requestCheckIn,
  };
}

function clientArgs(options: { session?: ResolvedSession } = {}) {
  return argsFor({
    session: options.session ?? CLIENT_SESSION,
    request: new Request("https://evoa.fit/client/checkins"),
  });
}

function requestArgs(
  body: Record<string, unknown>,
  session: ResolvedSession = CLIENT_SESSION,
) {
  return argsFor({
    session,
    request: new Request("https://evoa.fit/api/check-ins", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function rawRequestArgs(body: string) {
  return argsFor({
    session: CLIENT_SESSION,
    request: new Request("https://evoa.fit/api/check-ins", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function argsFor(options: { session: ResolvedSession; request: Request }) {
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
      contextEntry(sessionContext, options.session),
    ],
    request: options.request,
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
