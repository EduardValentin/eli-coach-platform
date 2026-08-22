import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  mintSessionToken,
  publicJwk,
  signedInHeaders,
} from "~integration-test-config/clerk-session-tokens";
import {
  clerkRefusesSessionRevocation,
  clerkRevokesSessions,
  clerkServesJwks,
} from "~integration-test-config/wire-mock/expectations/clerk-api";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

type Role = "USER" | "CLIENT" | "COACH";

function portalRequest(options: {
  portal: "client" | "coach";
  token?: string;
}): Request {
  return new Request(suite.url(`/${options.portal}`), {
    headers: options.token ? signedInHeaders(options.token) : undefined,
  });
}

/** Every refusal leaves as a redirect, so a denial is always a Response. */
async function refusedAt(options: {
  portal: "client" | "coach";
  token?: string;
}): Promise<Response> {
  const result = await suite.documentResult(portalRequest(options));

  if (!(result instanceof Response)) {
    throw new Error(`Expected ${options.portal} to refuse, but it admitted.`);
  }

  return result;
}

/** Seeds the account directly, because the role is what is under test. */
async function signedInAs(options: {
  role: Role;
  subjectId: string;
}): Promise<string> {
  await suite.postgres.executeSql({
    sql: `insert into app.accounts (auth_subject_id, role) values ($1, $2)`,
    values: [options.subjectId, options.role],
  });

  return mintSessionToken({
    sessionId: `sess_${options.subjectId}`,
    subjectId: options.subjectId,
  });
}

async function serveClerkContract(): Promise<void> {
  await suite.wireMock.stub(clerkServesJwks(publicJwk));
  await suite.wireMock.stub(clerkRevokesSessions());
}

describe.sequential("portal authorization integration", () => {
  beforeAll(async () => {
    await suite.start();
    await serveClerkContract();
  });

  afterEach(async () => {
    await suite.reset();
    await serveClerkContract();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it.each(["client", "coach"] as const)(
    "sends a signed-out visitor to sign in and back to the %s portal",
    async (portal) => {
      // arrange
      // act
      const response = await refusedAt({ portal });

      // assert
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(
        suite.path(`/auth/sign-in?redirect_url=%2F${portal}`),
      );
    },
  );

  it.each([
    ["CLIENT", "client"],
    ["COACH", "coach"],
  ] as const)("lets a %s into the %s portal", async (role, portal) => {
    // arrange
    const token = await signedInAs({ role, subjectId: `user_${role}_own` });

    // act
    const result = await suite.documentResult(portalRequest({ portal, token }));

    // assert
    expect(result).not.toBeInstanceOf(Response);
    expect((result as { statusCode: number | null }).statusCode).toBe(200);
  });

  it.each([
    ["CLIENT", "coach"],
    ["COACH", "client"],
    ["USER", "client"],
    ["USER", "coach"],
  ] as const)("refuses a %s at the %s portal", async (role, portal) => {
    // arrange
    const token = await signedInAs({
      role,
      subjectId: `user_${role}_at_${portal}`,
    });

    // act
    const response = await refusedAt({ portal, token });

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(suite.path("/403"));
  });

  it("signs out an identity whose account was deleted rather than admitting it", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: `insert into app.accounts (auth_subject_id, role, deleted) values ($1, 'CLIENT', true)`,
      values: ["user_deleted"],
    });
    const token = mintSessionToken({
      sessionId: "sess_deleted",
      subjectId: "user_deleted",
    });

    // act
    const response = await refusedAt({ portal: "client", token });

    // assert
    const revocations = await suite.wireMock.recordedRequests(
      "/v1/sessions/sess_deleted/revoke",
    );

    expect(response.headers.get("Location")).toBe(suite.path("/sign-in-failed"));
    expect(revocations).toHaveLength(1);
  });

  it("reports a deleted account as anonymous rather than failing the session lookup", async () => {
    // arrange
    await suite.postgres.executeSql({
      sql: `insert into app.accounts (auth_subject_id, role, deleted) values ($1, 'USER', true)`,
      values: ["user_gone"],
    });
    const token = mintSessionToken({
      sessionId: "sess_gone",
      subjectId: "user_gone",
    });

    // act
    const response = await suite.request(
      new Request(suite.url("/api/session"), { headers: signedInHeaders(token) }),
    );

    // assert
    expect(await response.json()).toEqual({ status: "anonymous" });
  });

  it("still turns a deleted identity away when Clerk refuses the revocation", async () => {
    // arrange
    await suite.wireMock.stub(clerkRefusesSessionRevocation("sess_unrevocable"));
    await suite.postgres.executeSql({
      sql: `insert into app.accounts (auth_subject_id, role, deleted) values ($1, 'CLIENT', true)`,
      values: ["user_unrevocable"],
    });
    const token = mintSessionToken({
      sessionId: "sess_unrevocable",
      subjectId: "user_unrevocable",
    });

    // act
    const response = await refusedAt({ portal: "client", token });

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(suite.path("/sign-in-failed"));
  });
});
