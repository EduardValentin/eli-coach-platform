import { createHash } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import {
  resendAcceptsEveryEmail,
  resendRejectsEveryEmail,
} from "~integration-test-config/wire-mock/expectations/resend-emails";

const suite = new ApiIntegrationTestSuite();

const coach = {
  sessionId: "sess_coachonboardsclients00",
  subjectId: "user_coachonboardsclients00",
};
const ordinaryMember = {
  sessionId: "sess_ordinarymemberonboard0",
  subjectId: "user_ordinarymemberonboard0",
};

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    activityLevel: "MODERATELY_ACTIVE",
    coachNotes: "Start conservative on volume.",
    dailyCalories: 1786,
    dateOfBirth: "1996-03-15",
    dietaryRestrictions: "Gluten sensitive.",
    email: "Jane.Doe@Example.com",
    firstName: "Jane",
    goalType: "FAT_LOSS",
    heightCm: 165,
    idempotencyKey: `key-${Math.random().toString(36).slice(2)}`,
    lastName: "Doe",
    macroSplit: { carbsPercent: 35, fatsPercent: 30, proteinPercent: 35 },
    sex: "FEMALE",
    targetWeightKg: 60,
    weightKg: 65,
    ...overrides,
  };
}

async function onboard(
  body: Record<string, unknown>,
  session: { sessionId: string; subjectId: string } | null = coach,
) {
  return suite.request(
    new Request(suite.url("/api/client-onboarding"), {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(session
          ? { authorization: `Bearer ${mintSessionToken(session)}` }
          : {}),
      },
      method: "POST",
    }),
  );
}

/**
 * Stands in for the client following her invitation link and signing in, which
 * is the only thing that binds an account to the profile the coach created.
 * That step belongs to a later ticket, so the suite performs it directly.
 */
async function bindProfileToAccount(options: {
  email: string;
  role: "CLIENT" | "USER";
}): Promise<void> {
  await suite.postgres.queryRows({
    // Named by the client's own email rather than by whichever profile happens
    // to be unbound, so a later test leaving a second one behind cannot make
    // this bind the wrong person.
    sql: `
      with new_account as (
        insert into app.accounts (auth_subject_id, role)
        values ($1, $2)
        returning id
      )
      update app.profiles
      set account_id = (select id from new_account)
      where id = (select profile_id from app.clients where normalized_email = $3)
    `,
    values: [
      `user_invitedclient${options.role.toLowerCase()}`,
      options.role,
      options.email.toLowerCase(),
    ],
  });
}

async function countRows(table: string): Promise<number> {
  const rows = await suite.postgres.queryRows<{ total: string }>({
    sql: `select count(*)::text as total from app.${table}`,
    values: [],
  });
  return Number(rows[0].total);
}

describe.sequential("client onboarding integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = coach.subjectId;
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  it("turns an accepted submission into a client, a goal and one invitation", async () => {
    // arrange & act
    const response = await onboard(validRequest());

    // assert
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      replacedPendingInvitation: boolean;
      success: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.replacedPendingInvitation).toBe(false);

    for (const table of [
      "profiles",
      "clients",
      "client_measurements",
      "client_goals",
      "nutrition_targets",
      "client_invitations",
    ]) {
      expect(await countRows(table)).toBe(1);
    }

    const emails = await suite.sentEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("Jane.Doe@Example.com");
  });

  it("stores the email folded for matching but keeps what the coach typed", async () => {
    // arrange & act
    await onboard(validRequest());

    // assert — the address is displayed as entered and matched case-folded
    const [client] = await suite.postgres.queryRows<{
      email: string;
      normalized_email: string;
    }>({
      sql: "select email, normalized_email from app.clients",
      values: [],
    });
    expect(client.email).toBe("Jane.Doe@Example.com");
    expect(client.normalized_email).toBe("jane.doe@example.com");
  });

  it("never stores the invitation token itself", async () => {
    // arrange & act
    await onboard(validRequest());

    // assert — a leaked database must not be usable to accept an invitation
    const [invitation] = await suite.postgres.queryRows<{
      token_hash: string;
    }>({ sql: "select token_hash from app.client_invitations", values: [] });
    expect(invitation.token_hash).toHaveLength(64);

    const emails = await suite.sentEmails();
    expect(emails[0].html).not.toContain(invitation.token_hash);
  });

  it("turns an anonymous caller away without storing anything", async () => {
    // arrange & act
    const response = await onboard(validRequest(), null);

    // assert
    expect(response.status).toBe(401);
    expect(await countRows("clients")).toBe(0);
  });

  it("turns a signed-in non-coach away without storing anything", async () => {
    // arrange & act
    const response = await onboard(validRequest(), ordinaryMember);

    // assert
    expect(response.status).toBe(403);
    expect(await countRows("clients")).toBe(0);
  });

  it("rejects an invalid submission field by field, writing nothing", async () => {
    // arrange & act
    const response = await onboard(
      validRequest({ email: "not-an-address", heightCm: 40 }),
    );

    // assert
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; issues: { field: string }[] };
    };
    expect(body.error.code).toBe("validation_failed");
    expect(body.error.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["email", "heightCm"]),
    );
    expect(await countRows("clients")).toBe(0);
    expect(await suite.sentEmails()).toHaveLength(0);
  });

  it("refuses a target weight the goal cannot reach", async () => {
    // arrange & act — fat loss cannot raise the weight
    const response = await onboard(validRequest({ targetWeightKg: 70 }));

    // assert
    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { issues: { field: string }[] };
    };
    expect(body.error.issues.map((issue) => issue.field)).toContain(
      "targetWeightKg",
    );
    expect(await countRows("clients")).toBe(0);
  });

  it("replaces a pending invitation rather than issuing a second one", async () => {
    // arrange
    await onboard(validRequest());
    const [first] = await suite.postgres.queryRows<{ token_hash: string }>({
      sql: "select token_hash from app.client_invitations",
      values: [],
    });

    // act — the same client onboarded again, with a new submission
    const response = await onboard(validRequest({ dailyCalories: 1700 }));

    // assert — one invitation, a different token, and the replaced wording
    expect(response.status).toBe(201);
    expect(
      ((await response.json()) as { replacedPendingInvitation: boolean })
        .replacedPendingInvitation,
    ).toBe(true);
    expect(await countRows("client_invitations")).toBe(1);
    expect(await countRows("clients")).toBe(1);

    const [second] = await suite.postgres.queryRows<{ token_hash: string }>({
      sql: "select token_hash from app.client_invitations",
      values: [],
    });
    expect(second.token_hash).not.toBe(first.token_hash);

    const emails = await suite.sentEmails();
    expect(emails).toHaveLength(2);
    expect(emails[1].subject).toBe("Your new invitation link");
  });

  it("supersedes the standing goal rather than leaving two active", async () => {
    // arrange
    await onboard(validRequest());

    // act
    await onboard(validRequest({ goalType: "MAINTENANCE" }));

    // assert — history is kept, but only one goal is current
    const active = await suite.postgres.queryRows<{ type: string }>({
      sql: "select type from app.client_goals where status = 'ACTIVE'",
      values: [],
    });
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe("MAINTENANCE");
    expect(await countRows("client_goals")).toBe(2);
  });

  it("treats a repeated submission key as the same operation", async () => {
    // arrange
    const request = validRequest();
    await onboard(request);

    // act — the same key and the same details, as a retry would send
    const response = await onboard(request);

    // assert — no second measurement, no second set of targets
    expect(response.status).toBe(201);
    expect(await countRows("client_measurements")).toBe(1);
    expect(await countRows("nutrition_targets")).toBe(1);
    expect(await countRows("client_invitations")).toBe(1);
  });

  it("refuses a repeated key carrying different details", async () => {
    // arrange
    const request = validRequest();
    await onboard(request);

    // act
    const response = await onboard({ ...request, firstName: "Janet" });

    // assert
    expect(response.status).toBe(409);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("idempotency_conflict");
  });

  it("refuses an email that already belongs to one of her clients", async () => {
    // arrange — the invited woman followed her link and finished onboarding
    await onboard(validRequest());
    await bindProfileToAccount({ email: "Jane.Doe@Example.com", role: "CLIENT" });

    // act
    const response = await onboard(validRequest());

    // assert — nothing about the standing client is touched
    expect(response.status).toBe(409);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("already_a_client");
    expect(await countRows("clients")).toBe(1);
    expect(await countRows("client_measurements")).toBe(1);
    expect(await countRows("client_invitations")).toBe(1);
  });

  it("invites a registered member who is not a client yet", async () => {
    // arrange — she signed up on her own before the coach ever invited her,
    // which leaves her holding an account but no coaching relationship
    await onboard(validRequest());
    await bindProfileToAccount({ email: "Jane.Doe@Example.com", role: "USER" });

    // act
    const response = await onboard(validRequest());

    // assert — the invitation goes out against the profile she already has
    expect(response.status).toBe(201);
    expect(await countRows("profiles")).toBe(1);
    expect(await countRows("clients")).toBe(1);
    expect(await countRows("client_invitations")).toBe(1);
    expect(await suite.sentEmails()).toHaveLength(2);
  });

  it("keeps the record when the invitation email cannot be sent", async () => {
    // arrange
    const request = validRequest();
    await suite.wireMock.stub(resendRejectsEveryEmail);

    // act
    const response = await onboard(request);

    // assert — the coach can send again rather than re-entering the wizard
    expect(response.status).toBe(502);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("invitation_email_failed");
    expect(await countRows("clients")).toBe(1);
    expect(await countRows("client_invitations")).toBe(1);
  });

  it("does not duplicate the client when a failed send is retried", async () => {
    // arrange — the first send is rejected, leaving the record behind
    const request = validRequest();
    await suite.wireMock.stub(resendRejectsEveryEmail);
    const failed = await onboard(request);
    expect(failed.status).toBe(502);
    expect(await countRows("clients")).toBe(1);

    // act — the same submission again with the provider healthy. Only the
    // WireMock stubs are replaced; resetting the suite here would drop the
    // database and leave the assertions below passing against an empty schema.
    await suite.wireMock.reset();
    await suite.wireMock.stub(resendAcceptsEveryEmail);
    const response = await onboard(request);

    // assert — the retry reuses the record rather than making a second one
    expect(response.status).toBe(201);
    expect(await countRows("clients")).toBe(1);
    expect(await countRows("profiles")).toBe(1);
    expect(await countRows("client_measurements")).toBe(1);
    expect(await countRows("client_invitations")).toBe(1);
  });

  it("keeps the stored hash matching the link the client was actually sent", async () => {
    // arrange — a first send that failed, so the client has no working link yet
    const request = validRequest();
    await suite.wireMock.stub(resendRejectsEveryEmail);
    await onboard(request);

    // act — the coach sends again
    await suite.wireMock.reset();
    await suite.wireMock.stub(resendAcceptsEveryEmail);
    await onboard(request);

    // assert — whatever link went out is the one the stored hash accepts, so a
    // retry cannot leave the client holding a token the database has rotated
    // away from
    const emails = await suite.sentEmails();
    expect(emails).toHaveLength(1);
    const [, sentToken] = emails[0].html.match(/invitation=([A-Za-z0-9_-]+)/) ?? [];
    expect(sentToken).toBeDefined();

    const [invitation] = await suite.postgres.queryRows<{ token_hash: string }>({
      sql: "select token_hash from app.client_invitations",
      values: [],
    });
    expect(invitation.token_hash).toBe(
      createHash("sha256").update(sentToken as string).digest("hex"),
    );
  });
});
