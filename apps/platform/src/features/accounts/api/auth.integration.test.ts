import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  mintForeignSessionToken,
  mintSessionToken,
  publicJwk,
  signedInHeaders,
} from "~integration-test-config/clerk-session-tokens";
import {
  clerkRevokesSessions,
  clerkServesJwks,
} from "~integration-test-config/wire-mock/expectations/clerk-api";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const BOOTSTRAP_COACH_SUBJECT_ID = "user_integrationbootstrapcoach";

async function startSignIn(redirectUrl?: string): Promise<Response> {
  const path = redirectUrl
    ? `/auth/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/auth/sign-in";

  return suite.request(new Request(suite.url(path)));
}

async function readRole(authSubjectId: string): Promise<string | null> {
  const [row] = await suite.postgres.queryRows<{ role: string }>({
    sql: `select role from app.accounts where auth_subject_id = $1`,
    values: [authSubjectId],
  });

  return row?.role ?? null;
}

async function requestSession(headers?: HeadersInit): Promise<Response> {
  return suite.request(new Request(suite.url("/api/session"), { headers }));
}

async function completeSignIn(options: {
  redirectUrl?: string;
  token: string;
}): Promise<Response> {
  const path = options.redirectUrl
    ? `/auth/complete?redirect_url=${encodeURIComponent(options.redirectUrl)}`
    : "/auth/complete";

  return suite.request(
    new Request(suite.url(path), { headers: signedInHeaders(options.token) }),
  );
}

async function countAccounts(authSubjectId: string): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.accounts",
    values: [authSubjectId],
    whereClause: "auth_subject_id = $1",
  });
}

async function serveClerkContract(): Promise<void> {
  await suite.wireMock.stub(clerkServesJwks(publicJwk));
  await suite.wireMock.stub(clerkRevokesSessions());
}

describe.sequential("authentication API integration", () => {
  beforeAll(async () => {
    await suite.start();
    await serveClerkContract();
  });

  // The suite's reset restores its own expectations, so Clerk's go back after it.
  afterEach(async () => {
    await suite.reset();
    await serveClerkContract();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("reports an anonymous session when no token is presented", async () => {
    // arrange
    // act
    const response = await requestSession();

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "anonymous" });
  });

  it("creates one general-user account on a first sign-in", async () => {
    // arrange
    const token = mintSessionToken({ sessionId: "sess_new", subjectId: "user_new" });

    // act
    const response = await completeSignIn({ redirectUrl: "/store", token });

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(suite.path("/store"));
    expect(await countAccounts("user_new")).toBe(1);
  });

  it("keeps one account when the same identity signs in twice", async () => {
    // arrange
    const token = mintSessionToken({
      sessionId: "sess_returning",
      subjectId: "user_returning",
    });

    // act
    await completeSignIn({ token });
    await completeSignIn({ token });

    // assert
    expect(await countAccounts("user_returning")).toBe(1);
  });

  it("keeps one account when two sign-ins race", async () => {
    // arrange
    const token = mintSessionToken({ sessionId: "sess_race", subjectId: "user_race" });

    // act
    await Promise.all([completeSignIn({ token }), completeSignIn({ token })]);

    // assert
    expect(await countAccounts("user_race")).toBe(1);
  });

  it("preserves a role the account was already promoted to", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: `insert into app.accounts (auth_subject_id, role) values ($1, 'CLIENT')`,
      values: ["user_client"],
    });
    const token = mintSessionToken({
      sessionId: "sess_client",
      subjectId: "user_client",
    });

    // act
    await completeSignIn({ token });
    const session = await requestSession(signedInHeaders(token));

    // assert
    expect(await session.json()).toEqual({ status: "authenticated", role: "CLIENT" });
  });

  it("refuses an off-site destination and returns the visitor to the Store", async () => {
    // arrange
    const token = mintSessionToken({ sessionId: "sess_evil", subjectId: "user_evil" });

    // act
    const response = await completeSignIn({
      redirectUrl: "https://evil.example/steal",
      token,
    });

    // assert
    expect(response.headers.get("Location")).toBe(suite.path("/store"));
  });

  it("reports the role a signed-in visitor holds", async () => {
    // arrange
    const token = mintSessionToken({ sessionId: "sess_user", subjectId: "user_plain" });
    await completeSignIn({ token });

    // act
    const response = await requestSession(signedInHeaders(token));

    // assert
    expect(await response.json()).toEqual({ status: "authenticated", role: "USER" });
  });

  it("treats an expired token as anonymous", async () => {
    // arrange
    const token = mintSessionToken({
      expiresInSeconds: -30,
      sessionId: "sess_expired",
      subjectId: "user_expired",
    });

    // act
    const response = await requestSession(signedInHeaders(token));

    // assert
    expect(await response.json()).toEqual({ status: "anonymous" });
  });

  it("treats a token signed by another key as anonymous", async () => {
    // arrange
    const forged = mintForeignSessionToken({
      sessionId: "sess_forged",
      subjectId: "user_forged",
    });

    // act
    const response = await requestSession(signedInHeaders(forged));

    // assert
    expect(await response.json()).toEqual({ status: "anonymous" });
    expect(await countAccounts("user_forged")).toBe(0);
  });

  it("sends the visitor to the hosted portal, asking it to return here", async () => {
    // arrange
    // act
    const response = await startSignIn("/coach");

    // assert
    const destination = new URL(response.headers.get("Location") ?? "");

    expect(response.status).toBe(302);
    expect(destination.origin).toBe("https://accounts.integration.test");
    expect(destination.searchParams.get("redirect_url")).toBe(
      `http://localhost${suite.path("/auth/complete")}?redirect_url=%2Fcoach`,
    );
  });

  it("refuses an off-site destination before the visitor ever leaves for Clerk", async () => {
    // arrange
    // act
    const response = await startSignIn("https://evil.example/steal");

    // assert
    const destination = new URL(response.headers.get("Location") ?? "");
    const returnUrl = new URL(destination.searchParams.get("redirect_url") ?? "");

    expect(returnUrl.searchParams.get("redirect_url")).toBe("/store");
  });

  it("answers the session with no-store, so no cache can serve one visitor another's role", async () => {
    // arrange
    // act
    const response = await requestSession();

    // assert
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("makes the one configured identity a COACH on its first sign-in", async () => {
    // arrange
    const token = mintSessionToken({
      sessionId: "sess_bootstrap",
      subjectId: BOOTSTRAP_COACH_SUBJECT_ID,
    });

    // act
    await completeSignIn({ token });

    // assert
    expect(await readRole(BOOTSTRAP_COACH_SUBJECT_ID)).toBe("COACH");
  });

  it("grants that role by subject, so no other identity can reach it", async () => {
    // arrange
    const token = mintSessionToken({
      sessionId: "sess_not_bootstrap",
      subjectId: `${BOOTSTRAP_COACH_SUBJECT_ID}x`,
    });

    // act
    await completeSignIn({ token });

    // assert
    expect(await readRole(`${BOOTSTRAP_COACH_SUBJECT_ID}x`)).toBe("USER");
  });

  it("refuses a token minted for another origin", async () => {
    // arrange
    // A token leaked from, or issued to, somewhere else is not for this
    // application, however genuinely Clerk signed it.
    const foreignOrigin = mintSessionToken({
      authorizedParty: "https://evil.example",
      sessionId: "sess_foreign_origin",
      subjectId: "user_foreign_origin",
    });

    // act
    const response = await requestSession(signedInHeaders(foreignOrigin));

    // assert
    expect(await response.json()).toEqual({ status: "anonymous" });
    expect(await countAccounts("user_foreign_origin")).toBe(0);
  });
});
