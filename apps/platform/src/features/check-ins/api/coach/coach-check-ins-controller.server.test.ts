import {
  CheckIn,
  type ApproveCheckInResult,
  type ApproveCheckInUseCase,
  type DeclineCheckInResult,
  type DeclineCheckInUseCase,
  type ListCoachCheckInsUseCase,
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
  clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
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
          ...PENDING.viewAt(NOW),
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
          proposedBy: "client",
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
      controller.loadCheckIns(coachArgs(CLIENT_SESSION)),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(listCoachCheckIns).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInsController approve", () => {
  it("approves the request and names it in the answer", async () => {
    // arrange
    const { controller, approveCheckIn } = createController({
      approved: { status: "approved", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.approve(coachArgs(), CHECK_IN_ID);

    // assert
    expect(approveCheckIn).toHaveBeenCalledWith(CHECK_IN_ID);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "approved",
      checkInId: CHECK_IN_ID,
    });
  });

  it.each<ApproveCheckInResult>([
    { status: "not_pending" },
    { status: "expired" },
    { status: "not_your_turn" },
  ])(
    "answers 409 not_pending when the approval is refused as $status",
    async (result) => {
      // arrange
      const { controller } = createController({ approved: result });

      // act
      const response = await controller.approve(coachArgs(), CHECK_IN_ID);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
    },
  );

  it("answers not found to a check-in that does not exist", async () => {
    // arrange
    const { controller } = createController({
      approved: { status: "unknown" },
    });

    // act
    const response = await controller.approve(coachArgs(), CHECK_IN_ID);

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses a client without approving anything", async () => {
    // arrange
    const { controller, approveCheckIn } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.approve(coachArgs(CLIENT_SESSION), CHECK_IN_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(approveCheckIn).not.toHaveBeenCalled();
  });
});

describe("CoachCheckInsController decline", () => {
  it("declines the request and names it in the answer", async () => {
    // arrange
    const { controller, declineCheckIn } = createController({
      declined: { status: "declined", checkIn: PENDING.toSnapshot() },
    });

    // act
    const response = await controller.decline(coachArgs(), CHECK_IN_ID);

    // assert
    expect(declineCheckIn).toHaveBeenCalledWith(CHECK_IN_ID);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "declined",
      checkInId: CHECK_IN_ID,
    });
  });

  it.each<DeclineCheckInResult>([
    { status: "not_pending" },
    { status: "expired" },
    { status: "not_your_turn" },
  ])(
    "answers 409 not_pending when the decline is refused as $status",
    async (result) => {
      // arrange
      const { controller } = createController({ declined: result });

      // act
      const response = await controller.decline(coachArgs(), CHECK_IN_ID);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
    },
  );

  it("answers not found to an id that is not a uuid without declining anything", async () => {
    // arrange
    const { controller, declineCheckIn } = createController();

    // act
    const response = await controller.decline(coachArgs(), "not-an-id");

    // assert
    expect(response.status).toBe(404);
    expect(declineCheckIn).not.toHaveBeenCalled();
  });
});

function createController(
  answers: {
    listed?: Awaited<ReturnType<ListCoachCheckInsUseCase["execute"]>>;
    approved?: ApproveCheckInResult;
    declined?: DeclineCheckInResult;
  } = {},
) {
  const listCoachCheckIns = vi.fn().mockResolvedValue(answers.listed ?? []);
  const approveCheckIn = vi
    .fn()
    .mockResolvedValue(answers.approved ?? { status: "unknown" });
  const declineCheckIn = vi
    .fn()
    .mockResolvedValue(answers.declined ?? { status: "unknown" });
  const controller = new CoachCheckInsController({
    approveCheckIn: {
      execute: approveCheckIn,
    } as unknown as ApproveCheckInUseCase,
    declineCheckIn: {
      execute: declineCheckIn,
    } as unknown as DeclineCheckInUseCase,
    listCoachCheckIns: {
      execute: listCoachCheckIns,
    } as unknown as ListCoachCheckInsUseCase,
  });

  return { controller, approveCheckIn, declineCheckIn, listCoachCheckIns };
}

function coachArgs(session: ResolvedSession = COACH_SESSION) {
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
      contextEntry(sessionContext, session),
    ],
    request: new Request("https://evoa.fit/api/check-ins", { method: "POST" }),
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
