import { createHash } from "node:crypto";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  ApiIntegrationTestSuite,
  type SentEmail,
} from "~integration-test-config/api-integration-test-suite";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
} from "~integration-test-config/coaching-sales-journey";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  CLERK_INVITATION_URL,
  CLERK_INVITATIONS_PATH,
  clerkCreatesInvitation,
  clerkInvitationRevocationPath,
  clerkRefusesInvitationRevocations,
  clerkServesUser,
} from "~integration-test-config/wire-mock/expectations/clerk-backend-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const INVITATION_RESENDS_API = "/api/coaching-sales/invitation-resends";
const INVITATION_API = "/api/coaching-sales/invitation";
const INVITATION_SUBJECT = "Your place is booked — create your account.";
const INVITATION_LINK = /https?:\/\/[^\s"<]+\/invitation#([\w-]+)/;
const EARLIER_PROVIDER_ID = "inv_integration";
const FRESH_PROVIDER_ID = "inv_integration_fresh";
const UNKNOWN_CLIENT_ID = "0b8d2f7e-2f55-4d3e-9d7c-7d7a3f1c2b10";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const RESEND_INSTANT = new Date(
  CALL_ENDED_INSTANT.getTime() + 3 * DAY_IN_MILLISECONDS,
);

const INVITED_CLIENT: AccountSession = {
  sessionId: "sess_invited_1",
  subjectId: "user_invited_1",
};

type InvitationRow = {
  clientId: string;
  emailDeliveryFailedAt: Date | null;
  emailSentAt: Date | null;
  expiresAt: Date;
  id: string;
  providerInvitationId: string | null;
  providerInvitationUrl: string | null;
  sentAt: Date;
  tokenHash: string;
  usedAt: Date | null;
};

describe.sequential("coach clients integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  describe("re-sending an invitation", () => {
    it("reissues her invitation, revokes the earlier Clerk invitation before creating a fresh one and emails her the fresh link once", async () => {
      // arrange
      const earlier = await payAndReadInvitation();
      const earlierToken = await journey.latestInvitationToken();
      await suite.wireMock.stub(clerkCreatesInvitation(FRESH_PROVIDER_ID));
      await rig.holdClock(RESEND_INSTANT);

      // act
      const response = await resendAs(COACH_SESSION, earlier.clientId);

      // assert
      const reissued = await readInvitation();
      const [firstCreation, freshCreation, ...otherCreations] =
        await suite.wireMock.recordedRequests(CLERK_INVITATIONS_PATH);
      const [revocation, ...otherRevocations] =
        await suite.wireMock.recordedRequests(
          clerkInvitationRevocationPath(EARLIER_PROVIDER_ID),
        );
      const emails = await invitationEmails();
      const freshToken = invitationTokenIn(emails.at(-1));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: "sent",
        email: ANA.email,
      });
      expect(reissued).toMatchObject({
        id: earlier.id,
        clientId: earlier.clientId,
        emailDeliveryFailedAt: null,
        emailSentAt: RESEND_INSTANT,
        providerInvitationId: FRESH_PROVIDER_ID,
        providerInvitationUrl: CLERK_INVITATION_URL,
        sentAt: RESEND_INSTANT,
        usedAt: null,
      });
      expect(reissued?.tokenHash).not.toBe(earlier.tokenHash);
      expect(otherCreations).toEqual([]);
      expect(otherRevocations).toEqual([]);
      expect(revocation?.method).toBe("POST");
      expect(revocation?.loggedDate).toBeGreaterThanOrEqual(
        firstCreation?.loggedDate ?? Number.POSITIVE_INFINITY,
      );
      expect(revocation?.loggedDate).toBeLessThanOrEqual(
        freshCreation?.loggedDate ?? Number.NEGATIVE_INFINITY,
      );
      expect(emails).toHaveLength(2);
      expect(emails.at(-1)).toMatchObject({
        idempotencyKey: `client-invitation:${earlier.id}:${RESEND_INSTANT.toISOString()}`,
        to: ANA.email,
      });
      expect(sha256(freshToken)).toBe(reissued?.tokenHash);
      expect(await resolveInvitation(freshToken)).toEqual({
        state: "valid",
        email: ANA.email,
        continueUrl: CLERK_INVITATION_URL,
      });
      expect(await resolveInvitation(earlierToken)).toEqual({
        state: "unavailable",
      });
    });

    it("answers 503 while Clerk refuses to revoke, keeping the earlier Clerk invitation on the record and sending no email", async () => {
      // arrange
      const earlier = await payAndReadInvitation();
      await suite.wireMock.stub(clerkRefusesInvitationRevocations);
      await rig.holdClock(RESEND_INSTANT);

      // act
      const response = await resendAs(COACH_SESSION, earlier.clientId);

      // assert
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "send-failed" });
      expect(await readInvitation()).toMatchObject({
        emailSentAt: null,
        providerInvitationId: EARLIER_PROVIDER_ID,
        providerInvitationUrl: CLERK_INVITATION_URL,
        sentAt: RESEND_INSTANT,
      });
      expect(
        await suite.wireMock.recordedRequests(CLERK_INVITATIONS_PATH),
      ).toHaveLength(1);
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("revokes the earlier Clerk invitation when the coach retries after Clerk refused", async () => {
      // arrange
      const earlier = await payAndReadInvitation();
      await suite.wireMock.stub(clerkRefusesInvitationRevocations);
      await rig.holdClock(RESEND_INSTANT);
      await resendAs(COACH_SESSION, earlier.clientId);
      await suite.wireMock.reset();
      await suite.wireMock.stub(clerkCreatesInvitation(FRESH_PROVIDER_ID));

      // act
      const response = await resendAs(COACH_SESSION, earlier.clientId);

      // assert
      const reissued = await readInvitation();
      const emails = await invitationEmails();

      expect(response.status).toBe(200);
      expect(
        await suite.wireMock.recordedRequests(
          clerkInvitationRevocationPath(EARLIER_PROVIDER_ID),
        ),
      ).toHaveLength(1);
      expect(
        await suite.wireMock.recordedRequests(CLERK_INVITATIONS_PATH),
      ).toHaveLength(1);
      expect(reissued).toMatchObject({
        emailSentAt: RESEND_INSTANT,
        providerInvitationId: FRESH_PROVIDER_ID,
      });
      expect(emails).toHaveLength(1);
      expect(sha256(invitationTokenIn(emails[0]))).toBe(reissued?.tokenHash);
    });

    it("refuses with 409 once she has created her account, changing nothing", async () => {
      // arrange
      const earlier = await payAndReadInvitation();
      await acceptInvitationAs(INVITED_CLIENT, earlier.id);
      const accepted = await readInvitation();

      // act
      const response = await resendAs(COACH_SESSION, earlier.clientId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "already-admitted" });
      expect(await readInvitation()).toEqual(accepted);
      expect(await revocationsOf(EARLIER_PROVIDER_ID)).toEqual([]);
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("answers 404 for a client no one paid for", async () => {
      // arrange
      await journey.payForCall();

      // act
      const response = await resendAs(COACH_SESSION, UNKNOWN_CLIENT_ID);

      // assert
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not-found" });
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("answers 400 when the client id is not a uuid", async () => {
      // arrange
      await journey.payForCall();

      // act
      const response = await resendAs(COACH_SESSION, "client-1");

      // assert
      expect(response.status).toBe(400);
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("refuses a CLIENT with 403, changing nothing", async () => {
      // arrange
      await rig.provisionClient();
      const earlier = await payAndReadInvitation();

      // act
      const response = await resendAs(CLIENT_SESSION, earlier.clientId);

      // assert
      expect(response.status).toBe(403);
      expect(await readInvitation()).toEqual(earlier);
      expect(await revocationsOf(EARLIER_PROVIDER_ID)).toEqual([]);
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("refuses an anonymous request with 401, changing nothing", async () => {
      // arrange
      const earlier = await payAndReadInvitation();

      // act
      const response = await suite.request(
        new Request(suite.url(INVITATION_RESENDS_API), {
          body: JSON.stringify({ clientId: earlier.clientId }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      );

      // assert
      expect(response.status).toBe(401);
      expect(await readInvitation()).toEqual(earlier);
      expect(await revocationsOf(EARLIER_PROVIDER_ID)).toEqual([]);
      expect(await invitationEmails()).toHaveLength(1);
    });

    it("answers any method but POST with 405", async () => {
      // arrange
      const earlier = await payAndReadInvitation();

      // act
      const response = await rig.requestAs(
        COACH_SESSION,
        INVITATION_RESENDS_API,
      );

      // assert
      expect(response.status).toBe(405);
      expect(await readInvitation()).toEqual(earlier);
    });
  });
});

async function payAndReadInvitation(): Promise<InvitationRow> {
  await journey.payForCall();
  const invitation = await readInvitation();

  if (!invitation) {
    throw new Error("The payment invited no one.");
  }

  return invitation;
}

async function resendAs(
  session: AccountSession,
  clientId: string,
): Promise<Response> {
  return rig.requestAs(session, INVITATION_RESENDS_API, {
    body: JSON.stringify({ clientId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function readInvitation(): Promise<InvitationRow | undefined> {
  const [invitation] = await suite.postgres.queryRows<InvitationRow>({
    sql: `
      select
        id,
        client_id as "clientId",
        token_hash as "tokenHash",
        sent_at as "sentAt",
        expires_at as "expiresAt",
        used_at as "usedAt",
        provider_invitation_id as "providerInvitationId",
        provider_invitation_url as "providerInvitationUrl",
        email_sent_at as "emailSentAt",
        email_delivery_failed_at as "emailDeliveryFailedAt"
      from app.client_invitations
    `,
    values: [],
  });

  return invitation;
}

async function acceptInvitationAs(
  session: AccountSession,
  invitationId: string,
): Promise<void> {
  await suite.wireMock.stub(
    clerkServesUser(session.subjectId, { invitationId }),
  );
  const response = await rig.requestAs(session, "/api/account");

  if (response.status !== 200) {
    throw new Error(`Accepting the invitation answered ${response.status}.`);
  }
}

async function resolveInvitation(token: string): Promise<unknown> {
  const response = await suite.request(
    new Request(suite.url(INVITATION_API), {
      body: JSON.stringify({ token }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  return response.json();
}

async function revocationsOf(providerInvitationId: string) {
  return suite.wireMock.recordedRequests(
    clerkInvitationRevocationPath(providerInvitationId),
  );
}

async function invitationEmails(): Promise<SentEmail[]> {
  return (await suite.sentEmails()).filter(
    (email) => email.subject === INVITATION_SUBJECT,
  );
}

function invitationTokenIn(email: SentEmail | undefined): string {
  const token = INVITATION_LINK.exec(email?.text ?? "")?.[1];

  if (!token) {
    throw new Error("The invitation email carries no invitation link.");
  }

  return token;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
