import type { AccountSnapshot } from "@eli-coach-platform/domain/accounts";
import { describe, expect, it, vi } from "vitest";

import { contextEntry, createRequestArgs } from "~/server/test-support/request-args";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";

const { middleware } = await import("./layout.server");

const [guardCoachPortal] = middleware;

describe("coach portal middleware", () => {
  it("sends a visitor with no session to sign in without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: { kind: "anonymous" },
      url: "https://evoa.fit/coach/clients?filter=active",
    });

    // act
    const thrown = await captureThrown(() => guardCoachPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      `https://accounts.evoa.fit/sign-in?redirect_url=${encodeURIComponent(
        "https://evoa.fit/coach/clients?filter=active",
      )}`,
    );
  });

  it("denies an account that owns another surface without running anything below it", async () => {
    // arrange
    const next = vi.fn();
    const args = createMiddlewareArgs({
      session: { account: buildAccount({ role: "CLIENT" }), kind: "authenticated" },
      url: "https://evoa.fit/coach",
    });

    // act
    const thrown = await captureThrown(() => guardCoachPortal(args, next));

    // assert
    expect(next).not.toHaveBeenCalled();
    expect((thrown as Response).status).toBe(403);
    await expect((thrown as Response).json()).resolves.toEqual({
      recovery: "client-portal",
    });
  });

  it("runs the rest of the request for a COACH", async () => {
    // arrange
    const portalDocument = new Response("coach portal");
    const next = vi.fn().mockResolvedValue(portalDocument);
    const args = createMiddlewareArgs({
      session: { account: buildAccount({ role: "COACH" }), kind: "authenticated" },
      url: "https://evoa.fit/coach",
    });

    // act
    const result = await guardCoachPortal(args, next);

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

function buildAccount(overrides: Partial<AccountSnapshot>): AccountSnapshot {
  return {
    authSubjectId: "user_1",
    id: "acct_1",
    role: "CLIENT",
    ...overrides,
  };
}

function createMiddlewareArgs(options: {
  session: ResolvedSession;
  url: string;
}): Parameters<typeof guardCoachPortal>[0] {
  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, {
        portal: {
          appBasePath: "/",
          publicAppUrl: "https://evoa.fit",
          signInUrl: "https://accounts.evoa.fit/sign-in",
        },
      } as AccountsFeature),
      contextEntry(sessionContext, options.session),
    ],
    request: new Request(options.url),
  }) as unknown as Parameters<typeof guardCoachPortal>[0];
}
