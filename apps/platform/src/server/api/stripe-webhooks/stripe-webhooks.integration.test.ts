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
  stripeInvoiceObject,
  stripeRefundedChargeObject,
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  STRIPE_CUSTOMER_ID,
  STRIPE_SUBSCRIPTION_ID,
  stripeAcceptsSubscriptionUpdatesAgain,
  stripeCreatesCheckoutSessionForBundle,
  stripeRefusesSubscriptionUpdates,
  stripeRetrievesExpiredSession,
  toUnixSeconds,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const SCHEDULED_END = new Date("2027-01-21T08:00:00.000Z");
const NOT_STARTED_ROW = {
  status: "not-started",
  startChoice: "immediate",
  cancelledAt: null,
  accessEndsAt: null,
  paymentProblemSince: null,
  refundReason: null,
  refundDueCents: null,
  refundDueBy: null,
  refundedCents: null,
  refundedAt: null,
};

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

  it("acknowledges a paid session whose purpose no handler serves and stores nothing", async () => {
    // arrange
    const { callId } = await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });

    // act
    const response = await journey.deliverCheckoutCompleted(
      { ...session, metadata: { ...session.metadata, purpose: "gift-card" } },
      COMPLETED_EVENT_ID,
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

  it("holds the renewal of the paid subscription by pausing its collection", async () => {
    // arrange
    await openCheckout();
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
    const updates = await lifecycle.providerSubscriptionRequests("POST");

    expect(response.status).toBe(200);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.get("pause_collection[behavior]")).toBe("void");
  });

  it("answers 500 when the hold fails, with the client already created and invited, then holds it on redelivery", async () => {
    // arrange
    await openCheckout();
    const session = await journey.completionOfCheckoutRequest({
      requestIndex: FIRST_CHECKOUT_REQUEST,
      sessionId: STRIPE_CHECKOUT_SESSION_ID,
    });
    await suite.wireMock.stub(stripeRefusesSubscriptionUpdates());

    // act
    const failed = await journey.deliverCheckoutCompleted(
      session,
      COMPLETED_EVENT_ID,
    );
    const invitationsAfterFailure = await countInvitations();
    await suite.wireMock.stub(stripeAcceptsSubscriptionUpdatesAgain());
    const redelivered = await journey.deliverCheckoutCompleted(
      session,
      COMPLETED_EVENT_ID,
    );

    // assert
    expect(failed.status).toBe(500);
    expect(invitationsAfterFailure).toBe(1);
    expect(redelivered.status).toBe(200);
    expect(await countPurchases()).toEqual({
      clients: 1,
      paymentEvents: 1,
      subscriptions: 1,
    });
    expect(await countInvitations()).toBe(1);
    expect(await lifecycle.providerSubscriptionRequests("POST")).toHaveLength(
      2,
    );
  });

  it("records a cancellation scheduled in Stripe with the access end it set", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_scheduled",
      type: "customer.subscription.updated",
      object: stripeSubscriptionObject({
        cancel_at: toUnixSeconds(SCHEDULED_END),
      }),
      previousAttributes: { cancel_at: null },
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual({
      ...NOT_STARTED_ROW,
      status: "cancelled",
      cancelledAt: rig.now(),
      accessEndsAt: SCHEDULED_END,
    });
  });

  it("puts a cancellation lifted in Stripe back to not started", async () => {
    // arrange
    await journey.payForCall();
    await lifecycle.deliverEvent({
      id: "evt_integration_scheduled",
      type: "customer.subscription.updated",
      object: stripeSubscriptionObject({
        cancel_at: toUnixSeconds(SCHEDULED_END),
      }),
      previousAttributes: { cancel_at: null },
    });

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_lifted",
      type: "customer.subscription.updated",
      object: stripeSubscriptionObject(),
      previousAttributes: { cancel_at: toUnixSeconds(SCHEDULED_END) },
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual(NOT_STARTED_ROW);
  });

  it("ends the subscription Stripe deleted at its end instant without a refund due", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_deleted",
      type: "customer.subscription.deleted",
      object: stripeSubscriptionObject({
        status: "canceled",
        ended_at: toUnixSeconds(rig.now()),
      }),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual({
      ...NOT_STARTED_ROW,
      status: "ended",
      cancelledAt: rig.now(),
      accessEndsAt: rig.now(),
    });
  });

  it("flags a payment problem from a failed invoice and clears it once a renewal is paid", async () => {
    // arrange
    await journey.payForCall();

    // act
    await lifecycle.deliverEvent({
      id: "evt_integration_failed",
      type: "invoice.payment_failed",
      object: stripeInvoiceObject("subscription_cycle"),
    });
    const flagged = await lifecycle.subscriptionRow();
    await lifecycle.deliverEvent({
      id: "evt_integration_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle"),
    });

    // assert
    expect(flagged.paymentProblemSince).toEqual(rig.now());
    expect(await lifecycle.subscriptionRow()).toEqual(NOT_STARTED_ROW);
  });

  it("records a refund the coach issued in Stripe as refunded with nothing owed", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_refunded",
      type: "charge.refunded",
      object: stripeRefundedChargeObject(20000),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual({
      ...NOT_STARTED_ROW,
      refundReason: "coach-issued",
      refundDueCents: 0,
      refundedCents: 20000,
      refundedAt: rig.now(),
    });
  });

  it("changes nothing when a subscription event is delivered again", async () => {
    // arrange
    await journey.payForCall();
    const failedPayment = {
      id: "evt_integration_failed",
      type: "invoice.payment_failed",
      object: stripeInvoiceObject("subscription_cycle"),
    };
    await lifecycle.deliverEvent(failedPayment);
    const recorded = await lifecycle.subscriptionRow();
    await rig.holdClock(new Date(rig.now().getTime() + 60_000));

    // act
    const response = await lifecycle.deliverEvent(failedPayment);

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual(recorded);
    expect(
      (await lifecycle.recordedEventIds()).filter(
        (id) => id === failedPayment.id,
      ),
    ).toHaveLength(1);
  });

  it("acknowledges an event for a subscription it does not know and records nothing", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_unknown",
      type: "customer.subscription.deleted",
      object: stripeSubscriptionObject({
        id: "sub_integration_unknown",
        status: "canceled",
        ended_at: toUnixSeconds(rig.now()),
      }),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionRow()).toEqual(NOT_STARTED_ROW);
    expect(await lifecycle.recordedEventIds()).not.toContain(
      "evt_integration_unknown",
    );
  });

  it("leaves the purchase invoice to the completed checkout", async () => {
    // arrange
    await journey.payForCall();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_integration_purchase_invoice",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_create"),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.recordedEventIds()).not.toContain(
      "evt_integration_purchase_invoice",
    );
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

async function countInvitations(): Promise<number> {
  return (
    (await suite.postgres.countRows({
      tableName: "app.client_invitations",
      values: [],
      whereClause: "true",
    })) ?? 0
  );
}
