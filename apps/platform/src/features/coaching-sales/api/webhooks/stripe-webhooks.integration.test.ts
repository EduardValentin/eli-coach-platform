import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import {
  ANA,
  CoachingSalesJourney,
  STRIPE_WEBHOOKS_API,
  FIRST_CHECKOUT_REQUEST,
  SECOND_CHECKOUT_REQUEST,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  stripeWebhook,
  stripeWebhookFromAnotherAccount,
} from "~integration-test-config/stripe-webhook-request";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  STRIPE_CUSTOMER_ID,
  STRIPE_SUBSCRIPTION_ID,
  stripeCreatesCheckoutSessionForBundle,
  stripeRetrievesExpiredSession,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const COMPLETED_EVENT_ID = "evt_integration_completed";
const REPLACEMENT_SESSION_ID = "cs_test_integrationreplacement";

type ClientRow = {
  assessmentCallId: string;
  country: string;
  dateOfBirth: string;
  email: string;
  firstName: string;
  gender: string;
  lastName: string;
  phone: string | null;
  primaryGoal: string;
};

type CoachingSubscriptionRow = {
  amountCents: number;
  assessmentCallId: string;
  bundleId: string;
  currency: string;
  months: number;
  paidAt: Date;
  startChoice: string;
  status: string;
  stripeCheckoutSessionId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: string;
};

type PurchaseCounts = {
  clients: number;
  paymentEvents: number;
  subscriptions: number;
};

const NOTHING_PURCHASED: PurchaseCounts = {
  clients: 0,
  paymentEvents: 0,
  subscriptions: 0,
};

describe.sequential("stripe webhooks integration", () => {
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

  it("creates the client and her coaching subscription from a completed checkout", async () => {
    // arrange
    const { callId } = await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });

    // act
    const response = await journey.deliverCheckoutCompleted(
      session,
      COMPLETED_EVENT_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await readClients()).toEqual([
      {
        assessmentCallId: callId,
        country: "RO",
        dateOfBirth: "1994-03-14",
        email: ANA.email,
        firstName: ANA.firstName,
        gender: "female",
        lastName: ANA.lastName,
        phone: "+40712345678",
        primaryGoal: "build_strength",
      },
    ]);
    expect(await readSubscriptions()).toEqual([
      {
        amountCents: 44700,
        assessmentCallId: callId,
        bundleId: "3-months",
        currency: "eur",
        months: 3,
        paidAt: rig.now(),
        startChoice: "immediate",
        status: "not-started",
        stripeCheckoutSessionId: STRIPE_CHECKOUT_SESSION_ID,
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        stripeSubscriptionId: STRIPE_SUBSCRIPTION_ID,
        tier: "regular",
      },
    ]);
    expect(await readPaymentLinkStates(callId)).toEqual(["spent"]);
    expect(await readPaymentEventIds()).toEqual([COMPLETED_EVENT_ID]);
  });

  it("changes nothing when the same event is delivered again", async () => {
    // arrange
    await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });
    await journey.deliverCheckoutCompleted(session, COMPLETED_EVENT_ID);

    // act
    const response = await journey.deliverCheckoutCompleted(
      session,
      COMPLETED_EVENT_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await countPurchases()).toEqual({
      clients: 1,
      paymentEvents: 1,
      subscriptions: 1,
    });
  });

  it("refuses an event signed by another account and stores nothing", async () => {
    // arrange
    const { callId } = await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });

    // act
    const response = await suite.request(
      stripeWebhookFromAnotherAccount({
        event: {
          data: { object: session },
          id: COMPLETED_EVENT_ID,
          type: "checkout.session.completed",
        },
        signedAt: rig.now(),
        url: suite.url(STRIPE_WEBHOOKS_API),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await countPurchases()).toEqual(NOTHING_PURCHASED);
    expect(await readPaymentLinkStates(callId)).toEqual(["valid"]);
  });

  it("acknowledges an event it does not handle and stores nothing", async () => {
    // arrange
    const { callId } = await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });

    // act
    const response = await suite.request(
      stripeWebhook({
        event: {
          data: { object: { ...session, status: "expired" } },
          id: "evt_integration_expired",
          type: "checkout.session.expired",
        },
        signedAt: rig.now(),
        url: suite.url(STRIPE_WEBHOOKS_API),
      }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await countPurchases()).toEqual(NOTHING_PURCHASED);
    expect(await readPaymentLinkStates(callId)).toEqual(["valid"]);
  });

  it("records nothing new when a second session for an already paid call completes", async () => {
    // arrange
    const { token } = await openCheckout();
    await suite.wireMock.stub(
      stripeCreatesCheckoutSessionForBundle("6-months", REPLACEMENT_SESSION_ID),
    );
    await suite.wireMock.stub(
      stripeRetrievesExpiredSession(STRIPE_CHECKOUT_SESSION_ID),
    );
    await journey.startCheckout({
      bundleId: "6-months",
      startChoice: "waiting",
      token,
    });
    await journey.deliverCheckoutCompleted(
      await journey.completionOfCheckoutRequest({
        requestIndex: SECOND_CHECKOUT_REQUEST,
        sessionId: REPLACEMENT_SESSION_ID,
      }),
      COMPLETED_EVENT_ID,
    );

    // act
    const response = await journey.deliverCheckoutCompleted(
      await journey.completionOfCheckoutRequest({
        requestIndex: FIRST_CHECKOUT_REQUEST,
        sessionId: STRIPE_CHECKOUT_SESSION_ID,
      }),
      "evt_integration_raced",
    );

    // assert
    const subscriptions = await readSubscriptions();

    expect(response.status).toBe(200);
    expect(await countPurchases()).toEqual({
      clients: 1,
      paymentEvents: 1,
      subscriptions: 1,
    });
    expect(subscriptions.map((row) => row.stripeCheckoutSessionId)).toEqual([
      REPLACEMENT_SESSION_ID,
    ]);
  });

  it("records a completed checkout while the site is in waiting-list mode", async () => {
    // arrange
    await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });
    await rig.switchWaitlistModeOn();

    // act
    const response = await journey.deliverCheckoutCompleted(
      session,
      COMPLETED_EVENT_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await countPurchases()).toEqual({
      clients: 1,
      paymentEvents: 1,
      subscriptions: 1,
    });
  });
});

async function openCheckout() {
  const sentLink = await journey.sendPaymentLinkAfterEndedCall();
  const response = await journey.startCheckout({
    bundleId: "3-months",
    startChoice: "immediate",
    token: sentLink.token,
  });

  expect(response.status).toBe(303);

  return sentLink;
}

async function countPurchases(): Promise<PurchaseCounts> {
  const [clients, subscriptions, paymentEvents] = await Promise.all(
    ["app.clients", "app.coaching_subscriptions", "app.payment_events"].map(
      (tableName) =>
        suite.postgres.countRows({
          tableName,
          values: [],
          whereClause: "true",
        }),
    ),
  );

  return {
    clients: clients ?? 0,
    paymentEvents: paymentEvents ?? 0,
    subscriptions: subscriptions ?? 0,
  };
}

async function readClients(): Promise<ClientRow[]> {
  return suite.postgres.queryRows<ClientRow>({
    sql: `
      select
        assessment_call_id as "assessmentCallId",
        first_name as "firstName",
        last_name as "lastName",
        email,
        date_of_birth::text as "dateOfBirth",
        gender,
        primary_goal as "primaryGoal",
        country,
        phone
      from app.clients
    `,
    values: [],
  });
}

async function readSubscriptions(): Promise<CoachingSubscriptionRow[]> {
  return suite.postgres.queryRows<CoachingSubscriptionRow>({
    sql: `
      select
        assessment_call_id as "assessmentCallId",
        bundle_id as "bundleId",
        months,
        tier,
        amount_cents as "amountCents",
        currency,
        stripe_customer_id as "stripeCustomerId",
        stripe_subscription_id as "stripeSubscriptionId",
        stripe_checkout_session_id as "stripeCheckoutSessionId",
        paid_at as "paidAt",
        start_choice as "startChoice",
        status
      from app.coaching_subscriptions
    `,
    values: [],
  });
}

async function readPaymentLinkStates(callId: string): Promise<string[]> {
  const rows = await suite.postgres.queryRows<{ state: string }>({
    sql: "select state from app.payment_links where assessment_call_id = $1",
    values: [callId],
  });

  return rows.map((row) => row.state);
}

async function readPaymentEventIds(): Promise<string[]> {
  const rows = await suite.postgres.queryRows<{ id: string }>({
    sql: "select id from app.payment_events",
    values: [],
  });

  return rows.map((row) => row.id);
}
