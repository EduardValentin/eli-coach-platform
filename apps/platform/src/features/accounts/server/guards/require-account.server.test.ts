import type { AccountSnapshot } from "@eli-coach-platform/domain/accounts";
import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";

import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { requireApiAccount } from "./require-account.server";
import { sessionContext, type ResolvedSession } from "./session-context.server";

describe("requireApiAccount", () => {
  it("rejects an anonymous caller with 401 unauthenticated", () => {
    // arrange
    const args = createLoaderArgs({
      session: { kind: "anonymous" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const thrown = captureThrown(() => requireApiAccount(args));

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(401);
    return expect((thrown as Response).json()).resolves.toEqual({
      error: "unauthenticated",
    });
  });

  it("rejects a mismatched role with 403 forbidden", () => {
    // arrange
    const account = buildAccount({ role: "CLIENT" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const thrown = captureThrown(() =>
      requireApiAccount(args, { role: "COACH" }),
    );

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
    return expect((thrown as Response).json()).resolves.toEqual({
      error: "forbidden",
    });
  });

  it("returns the account without a role check when none is required", () => {
    // arrange
    const account = buildAccount({ role: "CLIENT" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/store/acquisitions",
    });

    // act
    const result = requireApiAccount(args);

    // assert
    expect(result).toBe(account);
  });

  it("returns the account when its role matches the requirement", () => {
    // arrange
    const account = buildAccount({ role: "COACH" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const result = requireApiAccount(args, { role: "COACH" });

    // assert
    expect(result).toBe(account);
  });
});

function captureThrown(thunk: () => unknown): unknown {
  try {
    thunk();
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
  url: string;
}): LoaderFunctionArgs {
  return createRequestArgs({
    contexts: [contextEntry(sessionContext, options.session)],
    request: new Request(options.url),
  });
}
