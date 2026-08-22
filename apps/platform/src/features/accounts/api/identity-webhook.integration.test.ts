import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  mintSessionToken,
  publicJwk,
  signedInHeaders,
} from "~integration-test-config/clerk-session-tokens";
import {
  identityDeletedPayload,
  signedWebhookRequest,
} from "~integration-test-config/clerk-webhook-signing";
import {
  clerkRevokesSessions,
  clerkServesJwks,
} from "~integration-test-config/wire-mock/expectations/clerk-api";
import { loadIntegrationTestEnvironment } from "~integration-test-config/runtime-environment";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";

const suite = new ApiIntegrationTestSuite();

const { runtimeEnvironment } = loadIntegrationTestEnvironment();
const SIGNING_SECRET = runtimeEnvironment.CLERK_WEBHOOK_SIGNING_SECRET;
const WEBHOOK_PATH = "/api/auth/clerk-webhook";

function deliverDeletion(options: {
  messageId?: string;
  signingSecret?: string;
  subjectId: string;
}): Promise<Response> {
  return suite.request(
    signedWebhookRequest({
      body: identityDeletedPayload(options.subjectId),
      messageId: options.messageId,
      signingSecret: options.signingSecret ?? SIGNING_SECRET,
      url: suite.url(WEBHOOK_PATH),
    }),
  );
}

async function seedAccount(options: {
  role?: string;
  subjectId: string;
}): Promise<void> {
  await suite.postgres.executeSql({
    sql: `insert into app.accounts (auth_subject_id, role) values ($1, $2)`,
    values: [options.subjectId, options.role ?? "CLIENT"],
  });
}

async function countDeleted(subjectId: string): Promise<number> {
  return suite.postgres.countRows({
    tableName: "app.accounts",
    values: [subjectId],
    whereClause: "auth_subject_id = $1 and deleted = true",
  });
}

async function serveClerkContract(): Promise<void> {
  await suite.wireMock.stub(clerkServesJwks(publicJwk));
  await suite.wireMock.stub(clerkRevokesSessions());
}

describe.sequential("identity webhook integration", () => {
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

  it("marks the account deleted when Clerk reports the identity gone", async () => {
    // arrange
    await seedAccount({ subjectId: "user_deleted_by_clerk" });

    // act
    const response = await deliverDeletion({ subjectId: "user_deleted_by_clerk" });

    // assert
    expect(response.status).toBe(204);
    expect(await countDeleted("user_deleted_by_clerk")).toBe(1);
  });

  it("refuses a delivery signed with the wrong secret and changes nothing", async () => {
    // arrange
    await seedAccount({ subjectId: "user_forged_webhook" });

    // act
    const response = await deliverDeletion({
      signingSecret: "whsec_bm90LXRoZS1yZWFsLXNpZ25pbmctc2VjcmV0",
      subjectId: "user_forged_webhook",
    });

    // assert
    expect(response.status).toBe(400);
    expect(await countDeleted("user_forged_webhook")).toBe(0);
  });

  it("refuses a delivery carrying no signature at all", async () => {
    // arrange
    await seedAccount({ subjectId: "user_unsigned_webhook" });

    // act
    const response = await suite.request(
      new Request(suite.url(WEBHOOK_PATH), {
        body: identityDeletedPayload("user_unsigned_webhook"),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await countDeleted("user_unsigned_webhook")).toBe(0);
  });

  it("accepts a repeat delivery without complaint", async () => {
    // arrange
    await seedAccount({ subjectId: "user_retried_webhook" });

    // act
    const first = await deliverDeletion({ subjectId: "user_retried_webhook" });
    const second = await deliverDeletion({ subjectId: "user_retried_webhook" });

    // assert
    expect([first.status, second.status]).toEqual([204, 204]);
    expect(await countDeleted("user_retried_webhook")).toBe(1);
  });

  it("accepts a deletion for an identity that never signed in here", async () => {
    // arrange
    // act
    const response = await deliverDeletion({ subjectId: "user_never_seen" });

    // assert
    expect(response.status).toBe(204);
  });

  it("ignores an event it does not act on", async () => {
    // arrange
    await seedAccount({ subjectId: "user_updated" });

    // act
    const response = await suite.request(
      signedWebhookRequest({
        body: JSON.stringify({
          data: { id: "user_updated", object: "user" },
          object: "event",
          type: "user.updated",
        }),
        signingSecret: SIGNING_SECRET,
        url: suite.url(WEBHOOK_PATH),
      }),
    );

    // assert
    expect(response.status).toBe(204);
    expect(await countDeleted("user_updated")).toBe(0);
  });

  it("shuts a deleted identity out of the portal it could reach before", async () => {
    // arrange
    await seedAccount({ role: "CLIENT", subjectId: "user_locked_out" });
    const token = mintSessionToken({
      sessionId: "sess_locked_out",
      subjectId: "user_locked_out",
    });

    // act
    await deliverDeletion({ subjectId: "user_locked_out" });
    const portal = await suite.documentResult(
      new Request(suite.url("/client"), { headers: signedInHeaders(token) }),
    );

    // assert
    const revocations = await suite.wireMock.recordedRequests(
      "/v1/sessions/sess_locked_out/revoke",
    );

    expect(portal).toBeInstanceOf(Response);
    expect((portal as Response).headers.get("Location")).toBe(
      suite.path("/sign-in-failed"),
    );
    expect(revocations).toHaveLength(1);
  });

  it("refuses a GET on the webhook endpoint", async () => {
    // arrange
    // act
    const response = await suite.request(new Request(suite.url(WEBHOOK_PATH)));

    // assert
    expect(response.status).toBe(405);
  });
});
