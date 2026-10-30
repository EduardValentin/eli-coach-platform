import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { AccountController } from "./account-controller.server";

describe("AccountController", () => {
  it("returns the caller's role for an authenticated account", async () => {
    // arrange
    const account = buildAccount({ role: "COACH" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
    });
    const accountController = new AccountController();

    // act
    const response = await accountController.getCurrentAccount(args);

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ role: "COACH" });
  });

  it("propagates the guard's 401 for an anonymous caller", async () => {
    // arrange
    const args = createLoaderArgs({ session: { kind: "anonymous" } });
    const accountController = new AccountController();

    // act
    const thrown = await captureThrown(() =>
      accountController.getCurrentAccount(args),
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

function buildAccount(overrides: Partial<SessionAccount>): SessionAccount {
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
  return createRequestArgs({
    request: new Request("https://eli.example/api/account"),
    session: options.session,
  });
}
