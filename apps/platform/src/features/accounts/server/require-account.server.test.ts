import type { Account } from "@eli-coach-platform/domain";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";

import { accountContext, type ResolvedSession } from "./account-context.server";
import { requireApiAccount, requirePortalAccess } from "./require-account.server";

const SIGN_IN_URL = "https://accounts.evoa.fit/sign-in";

describe("requirePortalAccess", () => {
  it("redirects an anonymous visitor to sign-in with the request URL as the return target", () => {
    // arrange
    const args = createLoaderArgs({
      session: { kind: "anonymous" },
      url: "https://eli.example/client?tab=plan",
    });

    // act
    const thrown = captureThrown(() =>
      requirePortalAccess(args, { role: "CLIENT", signInUrl: SIGN_IN_URL }),
    );

    // assert
    expect(thrown).toBeInstanceOf(Response);
    const location = (thrown as Response).headers.get("Location");
    expect(location).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://eli.example/client?tab=plan")}`,
    );
  });

  it("swaps the redirect target's origin for publicAppUrl's origin while keeping path and query", () => {
    // arrange
    const args = createLoaderArgs({
      session: { kind: "anonymous" },
      url: "http://internal-host:4000/coach/clients?filter=active",
    });

    // act
    const thrown = captureThrown(() =>
      requirePortalAccess(args, {
        publicAppUrl: "https://evoa.fit",
        role: "COACH",
        signInUrl: SIGN_IN_URL,
      }),
    );

    // assert
    const location = (thrown as Response).headers.get("Location");
    expect(location).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://evoa.fit/coach/clients?filter=active")}`,
    );
  });

  it.each([
    ["USER", "store"],
    ["CLIENT", "client-portal"],
    ["COACH", "coach-portal"],
  ] as const)(
    "denies a %s account the wrong portal with 403 and recovery %s",
    (callerRole, recovery) => {
      // arrange
      const account = buildAccount({ role: callerRole });
      const guardedRole = callerRole === "COACH" ? "CLIENT" : "COACH";
      const args = createLoaderArgs({
        session: { account, kind: "authenticated" },
        url: "https://eli.example/client",
      });

      // act
      const thrown = captureThrown(() =>
        requirePortalAccess(args, { role: guardedRole, signInUrl: SIGN_IN_URL }),
      );

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
      return expect((thrown as Response).json()).resolves.toEqual({ recovery });
    },
  );

  it("admits nobody to a portal guarded for USER, the one role with no portal", () => {
    // arrange
    const account = buildAccount({ role: "USER" });
    const args = createLoaderArgs({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/client",
    });

    // act
    const thrown = captureThrown(() =>
      requirePortalAccess(args, { role: "USER", signInUrl: SIGN_IN_URL }),
    );

    // assert
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it.each(["CLIENT", "COACH"] as const)(
    "returns the account when a %s reaches its own portal",
    (role) => {
      // arrange
      const account = buildAccount({ role });
      const args = createLoaderArgs({
        session: { account, kind: "authenticated" },
        url: "https://eli.example/client",
      });

      // act
      const result = requirePortalAccess(args, { role, signInUrl: SIGN_IN_URL });

      // assert
      expect(result).toBe(account);
    },
  );
});

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
    const account = buildAccount({ role: "USER" });
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
    const account = buildAccount({ role: "USER" });
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
  url: string;
}): LoaderFunctionArgs {
  const context = new RouterContextProvider(
    new Map([[accountContext, options.session]]),
  );

  return {
    context,
    params: {},
    request: new Request(options.url),
  } as unknown as LoaderFunctionArgs;
}
