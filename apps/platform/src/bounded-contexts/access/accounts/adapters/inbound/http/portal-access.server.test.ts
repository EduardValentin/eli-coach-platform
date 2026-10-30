import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";

import {
  accessContext,
  type ResolvedSession,
  type SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createAccessRequestContext } from "./portal-access.server";

const SIGN_IN_URL = "https://accounts.evoa.fit/sign-in";

describe("accessContext", () => {
  it("reads as anonymous when no middleware resolved a session for the request", () => {
    // arrange
    const context = new RouterContextProvider();

    // act
    const { session } = context.get(accessContext);

    // assert
    expect(session).toEqual({ kind: "anonymous" });
  });
});

describe("requireAccount", () => {
  it("rejects an anonymous caller with 401 unauthenticated", () => {
    // arrange
    const access = createAccess({
      session: { kind: "anonymous" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const thrown = captureThrown(() => access.requireAccount());

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
    const access = createAccess({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const thrown = captureThrown(() =>
      access.requireAccount({ role: "COACH" }),
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
    const access = createAccess({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/store/acquisitions",
    });

    // act
    const result = access.requireAccount();

    // assert
    expect(result).toBe(account);
  });

  it("returns the account when its role matches the requirement", () => {
    // arrange
    const account = buildAccount({ role: "COACH" });
    const access = createAccess({
      session: { account, kind: "authenticated" },
      url: "https://eli.example/api/coach/clients",
    });

    // act
    const result = access.requireAccount({ role: "COACH" });

    // assert
    expect(result).toBe(account);
  });
});

describe("requirePortalAccess", () => {
  it("redirects an anonymous visitor to sign-in with the request URL as the return target", () => {
    // arrange
    const access = createAccess({
      session: { kind: "anonymous" },
      url: "https://eli.example/client?tab=plan",
    });

    // act
    const thrown = captureThrown(() => access.requirePortalAccess("CLIENT"));

    // assert
    expect(thrown).toBeInstanceOf(Response);
    const location = (thrown as Response).headers.get("Location");
    expect(location).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://eli.example/client?tab=plan")}`,
    );
  });

  it("swaps the redirect target's origin for publicAppUrl's origin while keeping path and query", () => {
    // arrange
    const access = createAccess({
      publicAppUrl: "https://evoa.fit",
      session: { kind: "anonymous" },
      url: "http://internal-host:4000/coach/clients?filter=active",
    });

    // act
    const thrown = captureThrown(() => access.requirePortalAccess("COACH"));

    // assert
    const location = (thrown as Response).headers.get("Location");
    expect(location).toBe(
      `${SIGN_IN_URL}?redirect_url=${encodeURIComponent("https://evoa.fit/coach/clients?filter=active")}`,
    );
  });

  it.each([
    ["CLIENT", "client-portal"],
    ["COACH", "coach-portal"],
  ] as const)(
    "denies a %s account the wrong portal with 403 and recovery %s",
    (callerRole, recovery) => {
      // arrange
      const account = buildAccount({ role: callerRole });
      const guardedRole = callerRole === "COACH" ? "CLIENT" : "COACH";
      const access = createAccess({
        session: { account, kind: "authenticated" },
        url: "https://eli.example/client",
      });

      // act
      const thrown = captureThrown(() =>
        access.requirePortalAccess(guardedRole),
      );

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
      return expect((thrown as Response).json()).resolves.toEqual({ recovery });
    },
  );

  it.each(["CLIENT", "COACH"] as const)(
    "returns the account when a %s reaches its own portal",
    (role) => {
      // arrange
      const account = buildAccount({ role });
      const access = createAccess({
        session: { account, kind: "authenticated" },
        url: "https://eli.example/client",
      });

      // act
      const result = access.requirePortalAccess(role);

      // assert
      expect(result).toBe(account);
    },
  );
});

function captureThrown(thunk: () => unknown): unknown {
  try {
    thunk();
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

function createAccess(options: {
  publicAppUrl?: string;
  session: ResolvedSession;
  url: string;
}) {
  return createAccessRequestContext(
    options.session,
    {
      appBasePath: "/",
      publicAppUrl: options.publicAppUrl,
      signInUrl: SIGN_IN_URL,
    },
    new URL(options.url),
  );
}
