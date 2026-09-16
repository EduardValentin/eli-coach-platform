import type { Account } from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";

import { contextEntry, createRequestArgs } from "~/server/test-support/request-args";

import type { AccountsFeature } from "../accounts-composition.server";
import { accountsContext } from "./accounts-context.server";
import { requirePortalAccess } from "./require-portal-access.server";
import { sessionContext, type ResolvedSession } from "./session-context.server";

const SIGN_IN_URL = "https://accounts.evoa.fit/sign-in";

describe("requirePortalAccess", () => {
  it("redirects an anonymous visitor to sign-in with the request URL as the return target", () => {
    // arrange
    const args = createLoaderArgs({
      publicAppUrl: undefined,
      session: { kind: "anonymous" },
      signInUrl: SIGN_IN_URL,
      url: "https://eli.example/client?tab=plan",
    });

    // act
    const thrown = captureThrown(() => requirePortalAccess(args, { role: "CLIENT" }));

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
      publicAppUrl: "https://evoa.fit",
      session: { kind: "anonymous" },
      signInUrl: SIGN_IN_URL,
      url: "http://internal-host:4000/coach/clients?filter=active",
    });

    // act
    const thrown = captureThrown(() => requirePortalAccess(args, { role: "COACH" }));

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
      const args = createLoaderArgs({
        publicAppUrl: undefined,
        session: { account, kind: "authenticated" },
        signInUrl: SIGN_IN_URL,
        url: "https://eli.example/client",
      });

      // act
      const thrown = captureThrown(() => requirePortalAccess(args, { role: guardedRole }));

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
      const args = createLoaderArgs({
        publicAppUrl: undefined,
        session: { account, kind: "authenticated" },
        signInUrl: SIGN_IN_URL,
        url: "https://eli.example/client",
      });

      // act
      const result = requirePortalAccess(args, { role });

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

function buildAccount(overrides: Partial<Account>): Account {
  return {
    authSubjectId: "user_1",
    deletedAt: null,
    id: "acct_1",
    role: "CLIENT",
    ...overrides,
  };
}

function createLoaderArgs(options: {
  publicAppUrl: string | undefined;
  session: ResolvedSession;
  signInUrl: string;
  url: string;
}): LoaderFunctionArgs {
  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, {
        portal: { appBasePath: "/", publicAppUrl: options.publicAppUrl, signInUrl: options.signInUrl },
      } as AccountsFeature),
      contextEntry(sessionContext, options.session),
    ],
    request: new Request(options.url),
  });
}
