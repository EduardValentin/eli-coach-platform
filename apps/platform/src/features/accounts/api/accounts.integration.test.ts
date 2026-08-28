import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { accountResponseSchema } from "~/features/accounts/contracts/account";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import {
  clerkWebhook,
  clerkWebhookFromAnotherInstance,
} from "~integration-test-config/clerk-webhook-request";
import { clerkSessionRevocationPath } from "~integration-test-config/wire-mock/expectations/clerk-backend-api";

type AccountRow = {
  deleted_at: Date | null;
  id: string;
  role: string;
};

type Session = {
  sessionId: string;
  subjectId: string;
};

const suite = new ApiIntegrationTestSuite();

const signedIn: Session = {
  sessionId: "sess_2aBcDeFgHiJkLmNoPqRsTuVwXyZ",
  subjectId: "user_2aBcDeFgHiJkLmNoPqRsTuVwXyZ",
};
const signedInAgain: Session = {
  sessionId: "sess_3zYxWvUtSrQpOnMlKjIhGfEdCbA",
  subjectId: "user_3zYxWvUtSrQpOnMlKjIhGfEdCbA",
};

describe.sequential("account API integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses an account request that carries no session token", async () => {
    // arrange, act
    const response = await suite.request(new Request(suite.url("/api/account")));

    // assert
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
  });

  it("provisions one USER account the first time a subject signs in", async () => {
    // arrange, act
    const response = await requestAccount(signedIn);

    // assert
    const rows = await accountsOf(signedIn);

    expect(response.status).toBe(200);
    expect(accountResponseSchema.parse(await response.json())).toEqual({
      role: "USER",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted_at).toBeNull();
  });

  it("keeps the same account when the subject comes back", async () => {
    // arrange
    await requestAccount(signedIn);
    const [provisioned] = await accountsOf(signedIn);

    // act
    const response = await requestAccount(signedIn);

    // assert
    const rows = await accountsOf(signedIn);

    expect(response.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(provisioned?.id);
  });

  it("keeps the role an account was moved to", async () => {
    // arrange
    await requestAccount(signedIn);
    await promoteToClient(signedIn);

    // act
    const response = await requestAccount(signedIn);

    // assert
    expect(accountResponseSchema.parse(await response.json())).toEqual({
      role: "CLIENT",
    });
  });

  it("sends a visitor with no session to Clerk to sign in", async () => {
    // arrange, act
    const response = await suite.request(new Request(suite.url("/client")));

    // assert
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(302);
    expect(`${location.origin}${location.pathname}`).toBe(
      "https://evoa.fit/sign-in",
    );
    expect(location.searchParams.get("redirect_url")).toContain("/client");
  });

  it("keeps a USER out of the client portal and names where they belong", async () => {
    // arrange
    await requestAccount(signedIn);

    // act
    const response = await requestPortal("/client", signedIn);

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ recovery: "store" });
  });

  it("lets a CLIENT into the client portal", async () => {
    // arrange
    await requestAccount(signedIn);
    await promoteToClient(signedIn);

    // act
    const response = await requestPortal("/client", signedIn);

    // assert
    expect(response.status).toBe(200);
  });

  it("keeps a CLIENT out of the coach portal and names where they belong", async () => {
    // arrange
    await requestAccount(signedIn);
    await promoteToClient(signedIn);

    // act
    const response = await requestPortal("/coach", signedIn);

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ recovery: "client-portal" });
  });

  it("soft-deletes the account a user.deleted webhook names", async () => {
    // arrange
    await requestAccount(signedIn);

    // act
    const response = await suite.request(
      clerkWebhook({
        event: { data: { id: signedIn.subjectId }, type: "user.deleted" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // assert
    const rows = await accountsOf(signedIn);

    expect(response.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted_at).not.toBeNull();
  });

  it("revokes the session still held by a deleted account and sends it to the failure page", async () => {
    // arrange
    await requestAccount(signedIn);
    await suite.request(
      clerkWebhook({
        event: { data: { id: signedIn.subjectId }, type: "user.deleted" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // act
    const response = await requestAccount(signedIn);

    // assert
    const revocations = await suite.wireMock.recordedRequests(
      clerkSessionRevocationPath(signedIn.sessionId),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/sign-in-failed");
    expect(revocations).toHaveLength(1);
  });

  it("never rejoins a deleted account when the person signs up again", async () => {
    // arrange
    await requestAccount(signedIn);
    await suite.request(
      clerkWebhook({
        event: { data: { id: signedIn.subjectId }, type: "user.deleted" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // act
    const response = await requestAccount(signedInAgain);

    // assert
    const [deleted] = await accountsOf(signedIn);
    const [provisioned] = await accountsOf(signedInAgain);

    expect(accountResponseSchema.parse(await response.json())).toEqual({
      role: "USER",
    });
    expect(provisioned?.id).not.toBe(deleted?.id);
    expect(deleted?.deleted_at).not.toBeNull();
    expect(provisioned?.deleted_at).toBeNull();
  });

  it("refuses a webhook signed by an instance it does not trust", async () => {
    // arrange
    await requestAccount(signedIn);

    // act
    const response = await suite.request(
      clerkWebhookFromAnotherInstance({
        event: { data: { id: signedIn.subjectId }, type: "user.deleted" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // assert
    const rows = await accountsOf(signedIn);

    expect(response.status).toBe(400);
    expect(rows[0]?.deleted_at).toBeNull();
  });

  it("accepts an event it does not act on and changes nothing", async () => {
    // arrange
    await requestAccount(signedIn);

    // act
    const response = await suite.request(
      clerkWebhook({
        event: { data: { id: signedIn.subjectId }, type: "user.updated" },
        url: suite.url("/api/clerk/webhooks"),
      }),
    );

    // assert
    const rows = await accountsOf(signedIn);

    expect(response.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted_at).toBeNull();
  });
});

async function requestAccount(session: Session): Promise<Response> {
  return suite.request(
    new Request(suite.url("/api/account"), {
      headers: { authorization: `Bearer ${mintSessionToken(session)}` },
    }),
  );
}

async function requestPortal(
  target: string,
  session: Session,
): Promise<Response> {
  return suite.request(
    new Request(suite.url(target), {
      headers: { authorization: `Bearer ${mintSessionToken(session)}` },
    }),
  );
}

// Test data the application has no entry point for: only a coach moves an
// account to CLIENT, and that flow does not exist yet. The suite owns its
// database, so the row is arranged there rather than through a repository.
async function promoteToClient(session: Session): Promise<void> {
  await suite.postgres.executeSql({
    sql: "update app.accounts set role = 'CLIENT' where auth_subject_id = $1",
    values: [session.subjectId],
  });
}

async function accountsOf(session: Session): Promise<AccountRow[]> {
  return suite.postgres.queryRows<AccountRow>({
    sql: "select id, role, deleted_at from app.accounts where auth_subject_id = $1",
    values: [session.subjectId],
  });
}
