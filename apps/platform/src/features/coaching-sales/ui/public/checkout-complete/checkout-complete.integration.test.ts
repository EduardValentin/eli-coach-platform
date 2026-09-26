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
import { ANA } from "~integration-test-config/coaching-sales-journey";
import { PlatformRig } from "~integration-test-config/platform-rig";
import { visibleDocument } from "~integration-test-config/rendered-page";
import {
  STRIPE_CHECKOUT_SESSION_ID,
  STRIPE_CHECKOUT_SESSIONS_PATH,
  completedCheckoutSession,
  openCheckoutSession,
  stripeRetrievesSession,
  type CheckoutSessionContent,
} from "~integration-test-config/wire-mock/expectations/stripe-api";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);

const PAID_ON = new Date("2026-10-21T08:00:00.000Z");
const CONFIRMATION_PAGE = `/checkout/complete?session=${STRIPE_CHECKOUT_SESSION_ID}`;
const PAYMENT_CONFIRMED_HEADING = /<h1[^>]*>Payment confirmed<\/h1>/;
const INVITATION_LEAD =
  "Your invitation is on its way. Eli sends it personally to";
const CALL_FIRST_HEADING = "A Call Comes First";

const threeMonthsBought: CheckoutSessionContent = {
  amountTotal: 44700,
  createdAt: PAID_ON,
  customerEmail: ANA.email,
  id: STRIPE_CHECKOUT_SESSION_ID,
  metadata: {
    assessmentCallId: "5d0c8a4e-2f7b-4c1e-9b3a-8e6f1d2c3b4a",
    bundleId: "3-months",
    months: "3",
    startChoice: "immediate",
    tier: "regular",
  },
};

describe.sequential("checkout complete page integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("confirms a paid checkout with what she bought and when it starts", async () => {
    // arrange
    await suite.wireMock.stub(
      stripeRetrievesSession(completedCheckoutSession(threeMonthsBought)),
    );

    // act
    const response = await suite.request(
      new Request(suite.url(CONFIRMATION_PAGE)),
    );

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(page).toMatch(PAYMENT_CONFIRMED_HEADING);
    expect(page).toContain(INVITATION_LEAD);
    expect(page).toContain(ANA.email);
    expect(purchaseSummaryRows(page)).toEqual([
      ["Bundle", "3 Months"],
      ["Amount", "€447"],
      ["Renews", "Every 3 months"],
      ["Your start", "Your program starts as soon as it&#x27;s ready"],
    ]);
  });

  it("names the day her program starts when she chose to wait out the withdrawal period", async () => {
    // arrange
    await suite.wireMock.stub(
      stripeRetrievesSession(
        completedCheckoutSession({
          ...threeMonthsBought,
          metadata: { ...threeMonthsBought.metadata, startChoice: "waiting" },
        }),
      ),
    );

    // act
    const response = await suite.request(
      new Request(suite.url(CONFIRMATION_PAGE)),
    );

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain(
      "After your 14-day withdrawal period — Eli starts working on your program on 4 November 2026.",
    );
  });

  it("asks for a call first when the session has not been paid", async () => {
    // arrange
    await suite.wireMock.stub(
      stripeRetrievesSession(openCheckoutSession(threeMonthsBought)),
    );

    // act
    const response = await suite.request(
      new Request(suite.url(CONFIRMATION_PAGE)),
    );

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain(CALL_FIRST_HEADING);
    expect(page).not.toMatch(PAYMENT_CONFIRMED_HEADING);
    expect(page).not.toContain(INVITATION_LEAD);
  });

  it("answers 404 in waiting-list mode without asking Stripe", async () => {
    // arrange
    await suite.wireMock.stub(
      stripeRetrievesSession(completedCheckoutSession(threeMonthsBought)),
    );
    await rig.switchWaitlistModeOn();

    // act
    const response = await suite.request(
      new Request(suite.url(CONFIRMATION_PAGE)),
    );

    // assert
    expect(response.status).toBe(404);
    expect(
      await suite.wireMock.recordedRequests(
        `${STRIPE_CHECKOUT_SESSIONS_PATH}/${STRIPE_CHECKOUT_SESSION_ID}`,
      ),
    ).toEqual([]);
  });
});

function purchaseSummaryRows(page: string): [string, string][] {
  return [
    ...page.matchAll(/<dt[^>]*>([^<]*)<\/dt><dd[^>]*>([^<]*)<\/dd>/g),
  ].map(([, term = "", value = ""]) => [term, value]);
}
