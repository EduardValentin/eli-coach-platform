import type { Account } from "@eli-coach-platform/domain";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";

import {
  accountContext,
  type ResolvedSession,
} from "~/features/accounts/ui/shared/account-context.server";

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

function buildAccount(overrides: Partial<Account>): Account {
  return {
    authSubjectId: "user_1",
    deletedAt: null,
    id: "acct_1",
    role: "USER",
    ...overrides,
  };
}

function createLoaderArgs(options: {
  session: ResolvedSession;
}): LoaderFunctionArgs {
  const context = new RouterContextProvider(
    new Map([[accountContext, options.session]]),
  );

  return {
    context,
    params: {},
    request: new Request("https://eli.example/api/account"),
  } as unknown as LoaderFunctionArgs;
}
