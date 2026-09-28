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
  FIRST_CHECKOUT_REQUEST,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  CLERK_INVITATION_URL,
  CLERK_INVITATIONS_PATH,
  clerkRefusesInvitations,
} from "~integration-test-config/wire-mock/expectations/clerk-backend-api";
import { resendFailsWithoutVerdict } from "~integration-test-config/wire-mock/expectations/resend-emails";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  type StripeCheckoutSession,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const PAID_EVENT_ID = "evt_integration_invited";
const INVITATION_SUBJECT = "Your place is booked — create your account.";
const INVITATION_LINK = /https?:\/\/[^\s"<]+\/invitation#([\w-]+)/;
const HOSTED_SIGN_UP_URL = "https://evoa.fit/sign-up";
const CLIENT_PORTAL_URL = "https://localhost:3000/eli-coach-platform/client";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

type ClerkInvitationRequest = {
  email_address: string;
  expires_in_days: number;
  ignore_existing: boolean;
  notify: boolean;
  public_metadata: Record<string, unknown>;
  redirect_url: string;
};

describe.sequential("invitations on payment integration", () => {
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

  it("invites the paid client once: one invitation, one silent Clerk invitation and one email", async () => {
    // arrange
    const { callId, session } = await openCheckout();

    // act
    const response = await deliverPayment(session);

    // assert
    const [invitation, ...otherInvitations] = await readInvitations();
    const clerkRequests = await readClerkInvitationRequests();
    const emails = await invitationEmails();

    expect(response.status).toBe(200);
    expect(otherInvitations).toEqual([]);
    expect(invitation).toMatchObject({
      clientId: await clientIdForCall(callId),
      emailDeliveryFailedAt: null,
      emailSentAt: CALL_ENDED_INSTANT,
      providerInvitationId: "inv_integration",
      providerInvitationUrl: CLERK_INVITATION_URL,
      sentAt: CALL_ENDED_INSTANT,
      usedAt: null,
    });
    expect(invitation?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(
      (invitation?.expiresAt.getTime() ?? 0) -
        (invitation?.sentAt.getTime() ?? 0),
    ).toBe(THIRTY_DAYS_MS);
    expect(clerkRequests).toHaveLength(1);
    expect(clerkRequests[0]).toEqual({
      email_address: ANA.email,
      expires_in_days: 30,
      ignore_existing: true,
      notify: false,
      public_metadata: { invitationId: invitation?.id },
      redirect_url: `${HOSTED_SIGN_UP_URL}?${new URLSearchParams({
        redirect_url: CLIENT_PORTAL_URL,
      })}`,
    });
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      idempotencyKey: `client-invitation:${invitation?.id}:${CALL_ENDED_INSTANT.toISOString()}`,
      replyTo: "contact@evoa.fit",
      to: ANA.email,
    });
    expect(sha256(invitationTokenIn(emails[0]))).toBe(invitation?.tokenHash);
  });

  it("invites no one again when the same payment event is delivered again", async () => {
    // arrange
    const { session } = await openCheckout();
    await deliverPayment(session);
    const invitationsBefore = await readInvitations();

    // act
    const response = await deliverPayment(session);

    // assert
    expect(response.status).toBe(200);
    expect(await readInvitations()).toEqual(invitationsBefore);
    expect(await readClerkInvitationRequests()).toHaveLength(1);
    expect(await invitationEmails()).toHaveLength(1);
  });

  it("answers 500 while Clerk refuses, keeping the invitation without a Clerk invitation and sending no email", async () => {
    // arrange
    const { session } = await openCheckout();
    await suite.wireMock.stub(clerkRefusesInvitations);

    // act
    const response = await deliverPayment(session);

    // assert
    const [invitation, ...otherInvitations] = await readInvitations();

    expect(response.status).toBe(500);
    expect(otherInvitations).toEqual([]);
    expect(invitation).toMatchObject({
      emailDeliveryFailedAt: null,
      emailSentAt: null,
      providerInvitationId: null,
      providerInvitationUrl: null,
    });
    expect(await invitationEmails()).toEqual([]);
  });

  it("completes the invitation on the next delivery once Clerk answers again and sends exactly one email", async () => {
    // arrange
    const { session } = await openCheckout();
    await suite.wireMock.stub(clerkRefusesInvitations);
    await deliverPayment(session);
    await suite.wireMock.reset();

    // act
    const response = await deliverPayment(session);

    // assert
    const [invitation, ...otherInvitations] = await readInvitations();
    const emails = await invitationEmails();

    expect(response.status).toBe(200);
    expect(otherInvitations).toEqual([]);
    expect(invitation).toMatchObject({
      emailSentAt: CALL_ENDED_INSTANT,
      providerInvitationId: "inv_integration",
      providerInvitationUrl: CLERK_INVITATION_URL,
    });
    expect(await readClerkInvitationRequests()).toHaveLength(1);
    expect(emails).toHaveLength(1);
    expect(sha256(invitationTokenIn(emails[0]))).toBe(invitation?.tokenHash);
  });

  it("records the failed invitation email and still acknowledges the payment", async () => {
    // arrange
    const { session } = await openCheckout();
    await suite.wireMock.stub(resendFailsWithoutVerdict("client-invitation:"));

    // act
    const response = await deliverPayment(session);

    // assert
    const [invitation] = await readInvitations();

    expect(response.status).toBe(200);
    expect(invitation).toMatchObject({
      emailDeliveryFailedAt: CALL_ENDED_INSTANT,
      emailSentAt: null,
      providerInvitationId: "inv_integration",
    });
    expect(await invitationEmails()).toHaveLength(1);
  });

  it("does not send the failed invitation email again when the payment event is delivered again", async () => {
    // arrange
    const { session } = await openCheckout();
    await suite.wireMock.stub(resendFailsWithoutVerdict("client-invitation:"));
    await deliverPayment(session);
    const invitationsBefore = await readInvitations();

    // act
    const response = await deliverPayment(session);

    // assert
    expect(response.status).toBe(200);
    expect(await readInvitations()).toEqual(invitationsBefore);
    expect(await invitationEmails()).toHaveLength(1);
    expect(await readClerkInvitationRequests()).toHaveLength(1);
  });
});

type OpenedCheckout = { callId: string; session: StripeCheckoutSession };

async function openCheckout(): Promise<OpenedCheckout> {
  const { callId, token } = await journey.sendPaymentLinkAfterEndedCall();
  await journey.startCheckout({
    bundleId: "3-months",
    startChoice: "immediate",
    token,
  });
  const session = await journey.completionOfCheckoutRequest({
    requestIndex: FIRST_CHECKOUT_REQUEST,
    sessionId: STRIPE_CHECKOUT_SESSION_ID,
  });

  return { callId, session };
}

async function deliverPayment(
  session: StripeCheckoutSession,
): Promise<Response> {
  return journey.deliverCheckoutCompleted(session, PAID_EVENT_ID);
}

async function readInvitations(): Promise<InvitationRow[]> {
  return suite.postgres.queryRows<InvitationRow>({
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
      order by created_at
    `,
    values: [],
  });
}

async function clientIdForCall(callId: string): Promise<string | undefined> {
  const [client] = await suite.postgres.queryRows<{ id: string }>({
    sql: "select id from app.clients where assessment_call_id = $1",
    values: [callId],
  });

  return client?.id;
}

async function readClerkInvitationRequests(): Promise<
  ClerkInvitationRequest[]
> {
  const requests = await suite.wireMock.recordedRequests(
    CLERK_INVITATIONS_PATH,
  );

  return requests.map(
    (request) => JSON.parse(request.body) as ClerkInvitationRequest,
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
