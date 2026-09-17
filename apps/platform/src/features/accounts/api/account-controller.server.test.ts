import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";

import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";

import { AccountController } from "./account-controller.server";

describe("AccountController", () => {
  it("returns the caller's role for an authenticated account", async () => {
    // arrange
    const account = buildAccount({ role: "COACH" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
    });
    const controller = new AccountController();

    // act
    const response = await controller.getCurrentAccount(args);

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ role: "COACH" });
  });

  it("propagates the guard's 401 for an anonymous caller", async () => {
    // arrange
    const args = createLoaderArgs({ session: { kind: "anonymous" } });
    const controller = new AccountController();

    // act
    const thrown = await captureThrown(() =>
      controller.getCurrentAccount(args),
    );

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(401);
    await expect((thrown as Response).json()).resolves.toEqual({
      error: "unauthenticated",
    });
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

function createLoaderArgs(options: {
  session: ResolvedSession;
}): LoaderFunctionArgs {
  const context = new RouterContextProvider(
    new Map([[sessionContext, options.session]]),
  );

  return {
    context,
    params: {},
    request: new Request("https://eli.example/api/account"),
  } as unknown as LoaderFunctionArgs;
}
