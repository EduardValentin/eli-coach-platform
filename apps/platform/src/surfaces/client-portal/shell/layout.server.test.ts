import type { Account } from "@eli-coach-platform/domain";
import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  accountContext,
  type ResolvedSession,
} from "~/features/accounts/server/account-context.server";

vi.mock("~/server/runtime-environment.server", () => ({
  getRuntimeEnvironment: () => ({
    CLERK_SIGN_IN_URL: "https://accounts.evoa.fit/sign-in",
    PUBLIC_APP_URL: "https://evoa.fit",
  }),
}));

const { middleware } = await import("./layout.server");

const [guardClientPortal] = middleware;

describe("client portal middleware", () => {
  it("sends a visitor with no session to sign in without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: { kind: "anonymous" },
      url: "https://evoa.fit/client?tab=plan",
    });

    // act
    const thrown = await captureThrown(() => guardClientPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      `https://accounts.evoa.fit/sign-in?redirect_url=${encodeURIComponent(
        "https://evoa.fit/client?tab=plan",
      )}`,
    );
  });

  it("denies an account that owns another surface without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: { account: buildAccount({ role: "COACH" }), kind: "authenticated" },
      url: "https://evoa.fit/client",
    });

    // act
    const thrown = await captureThrown(() => guardClientPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(403);
    await expect((thrown as Response).json()).resolves.toEqual({
      recovery: "coach-portal",
    });
  });

  it("runs the rest of the request for a CLIENT", async () => {
    // arrange
    const portalDocument = new Response("client portal");
    const next = vi.fn().mockResolvedValue(portalDocument);
    const args = createMiddlewareArgs({
      session: { account: buildAccount({ role: "CLIENT" }), kind: "authenticated" },
      url: "https://evoa.fit/client",
    });

    // act
    const result = await guardClientPortal(args, next);

    // assert
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe(portalDocument);
  });
});

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}

function buildAccount(overrides: Partial<Account>): Account {
  return {
    authSubjectId: "user_1",
    deletedAt: null,
    id: "acct_1",
    role: "USER",
    ...overrides,
  };
}

function createMiddlewareArgs(options: {
  session: ResolvedSession;
  url: string;
}): Parameters<typeof guardClientPortal>[0] {
  return {
    context: new RouterContextProvider(
      new Map([[accountContext, options.session]]),
    ),
    params: {},
    request: new Request(options.url),
  } as unknown as Parameters<typeof guardClientPortal>[0];
}
