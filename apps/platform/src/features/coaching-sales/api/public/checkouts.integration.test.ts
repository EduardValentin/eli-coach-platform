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
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  STRIPE_CHECKOUT_SESSIONS_PATH,
  STRIPE_CUSTOMER_ID,
  STRIPE_CUSTOMERS_PATH,
  hostedCheckoutUrl,
  stripeCheckoutSessionExpirePath,
  stripeCreatesCheckoutSessionForBundle,
  stripeRetrievesExpiredSession,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const journey = new CoachingSalesJourney(rig);

const REPLACEMENT_SESSION_ID = "cs_test_integrationreplacement";
const UNKNOWN_TOKEN = "unknown-payment-link-token";

type CheckoutSessionRow = {
  amountCents: number;
  bundleId: string;
  currency: string;
  expiredAt: Date | null;
  id: string;
  startChoice: string;
  tier: string;
};

describe.sequential("checkouts integration", () => {
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

  it("hands a valid choice to Stripe's hosted checkout as a subscription", async () => {
    // arrange
    const { callId, token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await journey.startCheckout({
      bundleId: "3-months",
      startChoice: "immediate",
      token,
    });

    // assert
    const customers = await suite.wireMock.recordedRequests(
      STRIPE_CUSTOMERS_PATH,
    );
    const [session, ...otherSessions] =
      await journey.requestedCheckoutSessions();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      hostedCheckoutUrl(STRIPE_CHECKOUT_SESSION_ID),
    );
    expect(customers).toHaveLength(1);
    expect(customers[0]?.headers["Idempotency-Key"]).toBe(
      `assessment-call:${callId}:customer`,
    );
    expect(new URLSearchParams(customers[0]?.body).get("email")).toBe(
      ANA.email,
    );
    expect(otherSessions).toEqual([]);
    expect(Object.fromEntries(session ?? [])).toMatchObject({
      customer: STRIPE_CUSTOMER_ID,
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][recurring][interval_count]": "3",
      "line_items[0][price_data][unit_amount]": "44700",
      "metadata[assessmentCallId]": callId,
      "metadata[bundleId]": "3-months",
      "metadata[months]": "3",
      "metadata[startChoice]": "immediate",
      "metadata[tier]": "regular",
      mode: "subscription",
      "payment_method_types[0]": "card",
      "subscription_data[metadata][assessmentCallId]": callId,
      "line_items[0][price_data][product_data][name]": "3 Months",
      success_url:
        "https://localhost:3000/eli-coach-platform/checkout/complete?session={CHECKOUT_SESSION_ID}",
      cancel_url: `https://localhost:3000/eli-coach-platform/select-bundle?token=${token}&payment=cancelled&bundle=3-months&start=immediate`,
    });
    expect(await readCheckoutSessions()).toEqual([
      {
        amountCents: 44700,
        bundleId: "3-months",
        currency: "eur",
        expiredAt: null,
        id: STRIPE_CHECKOUT_SESSION_ID,
        startChoice: "immediate",
        tier: "regular",
      },
    ]);
  });

  it("charges the reduced price when the call's email holds a reduced waitlist allocation", async () => {
    // arrange
    await journey.joinWaitlist(ANA.email);
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await journey.startCheckout({
      bundleId: "3-months",
      startChoice: "waiting",
      token,
    });

    // assert
    const [session] = await journey.requestedCheckoutSessions();

    expect(response.status).toBe(303);
    expect(session?.get("line_items[0][price_data][unit_amount]")).toBe(
      "37500",
    );
    expect(session?.get("metadata[tier]")).toBe("reduced");
    expect(session?.get("metadata[startChoice]")).toBe("waiting");
  });

  it("expires the earlier session when the same link opens a second checkout", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await suite.wireMock.stub(
      stripeCreatesCheckoutSessionForBundle("6-months", REPLACEMENT_SESSION_ID),
    );
    await suite.wireMock.stub(
      stripeRetrievesExpiredSession(STRIPE_CHECKOUT_SESSION_ID),
    );
    await journey.startCheckout({
      bundleId: "3-months",
      startChoice: "immediate",
      token,
    });

    // act
    const response = await journey.startCheckout({
      bundleId: "6-months",
      startChoice: "immediate",
      token,
    });

    // assert
    const expirations = await suite.wireMock.recordedRequests(
      stripeCheckoutSessionExpirePath(STRIPE_CHECKOUT_SESSION_ID),
    );
    const sessions = await readCheckoutSessions();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      hostedCheckoutUrl(REPLACEMENT_SESSION_ID),
    );
    expect(expirations).toHaveLength(1);
    expect(
      sessions.map(({ id, expiredAt }) => ({ id, expired: !!expiredAt })),
    ).toEqual([
      { expired: true, id: STRIPE_CHECKOUT_SESSION_ID },
      { expired: false, id: REPLACEMENT_SESSION_ID },
    ]);
  });

  it("returns her to the bundle page when no start choice was made", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();

    // act
    const response = await journey.startCheckout({
      bundleId: "3-months",
      token,
    });

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      suite.path(`/select-bundle?token=${token}&bundle=3-months`),
    );
    expect(await stripeRequests()).toEqual([]);
  });

  it("sends an invalid link back to the bundle page that asks for a call first", async () => {
    // arrange
    await journey.bookEndedCall();

    // act
    const response = await journey.startCheckout({
      bundleId: "3-months",
      startChoice: "immediate",
      token: UNKNOWN_TOKEN,
    });

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      suite.path(`/select-bundle?token=${UNKNOWN_TOKEN}`),
    );
    expect(await stripeRequests()).toEqual([]);
  });

  it("answers 404 in waiting-list mode and reaches no provider", async () => {
    // arrange
    const { token } = await journey.sendPaymentLinkAfterEndedCall();
    await rig.switchWaitlistModeOn();

    // act
    const response = await journey.startCheckout({
      bundleId: "3-months",
      startChoice: "immediate",
      token,
    });

    // assert
    expect(response.status).toBe(404);
    expect(await stripeRequests()).toEqual([]);
    expect(await readCheckoutSessions()).toEqual([]);
  });
});

async function stripeRequests() {
  return [
    ...(await suite.wireMock.recordedRequests(STRIPE_CUSTOMERS_PATH)),
    ...(await suite.wireMock.recordedRequests(STRIPE_CHECKOUT_SESSIONS_PATH)),
  ];
}

async function readCheckoutSessions(): Promise<CheckoutSessionRow[]> {
  return suite.postgres.queryRows<CheckoutSessionRow>({
    sql: `
      select
        id,
        bundle_id as "bundleId",
        tier,
        amount_cents as "amountCents",
        currency,
        start_choice as "startChoice",
        expired_at as "expiredAt"
      from app.checkout_sessions
      order by created_at, id
    `,
    values: [],
  });
}
