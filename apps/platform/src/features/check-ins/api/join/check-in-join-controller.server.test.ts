import type {
  CheckInJoinResult,
  ResolveCheckInJoinUseCase,
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

import { CheckInJoinController } from "./check-in-join-controller.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const ROOM_URL = "https://meet.google.com/abc-defg-hij";

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const COACH_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_eli", id: "acct_eli", role: "COACH" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

describe("CheckInJoinController resolveForClient", () => {
  it("sends the client to the coach's meeting room", async () => {
    // arrange
    const { controller, resolveCheckInJoin } = createController({
      status: "found",
      url: ROOM_URL,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForClient(argsFor(CLIENT_SESSION), CHECK_IN_ID),
    );

    // assert
    expect(resolveCheckInJoin).toHaveBeenCalledWith({
      actor: { party: "client", authSubjectId: "user_ana" },
      checkInId: CHECK_IN_ID,
    });
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("location")).toBe(ROOM_URL);
  });

  it("tells the client the room is not ready while none is set", async () => {
    // arrange
    const { controller } = createController({ status: "link_not_set" });

    // act
    const resolution = await controller.resolveForClient(
      argsFor(CLIENT_SESSION),
      CHECK_IN_ID,
    );

    // assert
    expect(resolution).toEqual({ status: "link_not_set" });
  });

  it("answers not found to a check-in the client cannot join", async () => {
    // arrange
    const { controller } = createController({ status: "unknown" });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForClient(argsFor(CLIENT_SESSION), CHECK_IN_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without resolving anything", async () => {
    // arrange
    const { controller, resolveCheckInJoin } = createController({
      status: "found",
      url: ROOM_URL,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForClient(argsFor(CLIENT_SESSION), "not-an-id"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(resolveCheckInJoin).not.toHaveBeenCalled();
  });

  it("sends a visitor who is not signed in to sign in, coming back to the link", async () => {
    // arrange
    const { controller, resolveCheckInJoin } = createController({
      status: "found",
      url: ROOM_URL,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForClient(argsFor(ANONYMOUS_SESSION), CHECK_IN_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("location")).toBe(
      `https://accounts.evoa.fit/sign-in?redirect_url=${encodeURIComponent(
        `https://evoa.fit/client/checkins/${CHECK_IN_ID}/join`,
      )}`,
    );
    expect(resolveCheckInJoin).not.toHaveBeenCalled();
  });
});

describe("CheckInJoinController resolveForCoach", () => {
  it("sends the coach to her meeting room", async () => {
    // arrange
    const { controller, resolveCheckInJoin } = createController({
      status: "found",
      url: ROOM_URL,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForCoach(argsFor(COACH_SESSION), CHECK_IN_ID),
    );

    // assert
    expect(resolveCheckInJoin).toHaveBeenCalledWith({
      actor: { party: "coach" },
      checkInId: CHECK_IN_ID,
    });
    expect((thrown as Response).headers.get("location")).toBe(ROOM_URL);
  });

  it("refuses a client on the coach's link without resolving anything", async () => {
    // arrange
    const { controller, resolveCheckInJoin } = createController({
      status: "found",
      url: ROOM_URL,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.resolveForCoach(argsFor(CLIENT_SESSION), CHECK_IN_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(resolveCheckInJoin).not.toHaveBeenCalled();
  });
});

function createController(resolution: CheckInJoinResult) {
  const resolveCheckInJoin = vi.fn().mockResolvedValue(resolution);
  const controller = new CheckInJoinController({
    resolveCheckInJoin: {
      execute: resolveCheckInJoin,
    } as unknown as ResolveCheckInJoinUseCase,
  });

  return { controller, resolveCheckInJoin };
}

function argsFor(session: ResolvedSession) {
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
    request: new Request(
      `https://evoa.fit/client/checkins/${CHECK_IN_ID}/join`,
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
