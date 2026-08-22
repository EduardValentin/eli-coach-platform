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

  it("revokes the session with Clerk on sign-out", async () => {
    // arrange
    const token = mintSessionToken({ sessionId: "sess_bye", subjectId: "user_bye" });
    await completeSignIn({ token });

    // act
    const response = await suite.request(
      new Request(suite.url("/auth/sign-out"), {
        headers: signedInHeaders(token),
        method: "POST",
      }),
    );

    // assert
    const revocations = await suite.wireMock.recordedRequests(
      "/v1/sessions/sess_bye/revoke",
    );

    expect(response.headers.get("Location")).toBe(suite.path("/store"));
    expect(revocations).toHaveLength(1);
  });
});
