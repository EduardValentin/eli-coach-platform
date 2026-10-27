import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import type { DatabaseClient } from "~/shared/database";
import type { PaymentCheckout } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { FeatureFlagSet } from "~/bounded-contexts/operations/feature-flags/domain/feature-flag";
import { InMemoryProductEmail } from "~/shared/email/index.server";
import {
  createTokenGenerator,
  createTokenHasher,
} from "~/shared/tokens/link-tokens.server";
import { createPayments } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/create-payments.server";
import { describe, expect, it, vi } from "vitest";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import {
  composeCoachingSalesFeature,
  type CoachingSalesFeatureHandles,
} from "./composition.server";

const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

describe("composeCoachingSalesFeature", () => {
  it("refuses to send a payment link while the site is in waitlist mode", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const response = await feature.paymentLinks.sendPaymentLink(
      coachSendsPaymentLinkArgs(),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "closed" });
  });

  it("closes checkout and its confirmation when the sales mode cannot be read", async () => {
    // arrange
    const logger = createLogger();
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({}),
      featureFlags: {
        execute: async () => {
          throw new Error("database down");
        },
      },
      logger,
    });

    // act
    const confirmation = feature.checkouts.loadConfirmation(
      createRequestArgs({
        request: new Request(
          "https://evoa.fit/checkout/complete?session=cs_test_1",
        ),
      }),
    );
    const checkout = await feature.checkouts.startCheckout(
      createRequestArgs({ request: checkoutRequest() }),
    );

    // assert
    await expect(confirmation).rejects.toMatchObject({ status: 404 });
    expect(checkout.status).toBe(404);
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      "Coaching sales mode feature flag read failed.",
      {
        errorCategory: "coaching_sales_mode_read_failure",
        errorClass: "Error",
        errorMessage: "database down",
      },
    );
  });

  it("answers a short token with the call-first page without reading any link", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(createHandles({}));

    // act
    const response = await feature.checkouts.resolveBundlePage(
      createRequestArgs({ request: bundlePageRequest("abc") }),
    );

    // assert
    expect(await response.json()).toMatchObject({ state: "call-first" });
  });

  it("hands a completed checkout to purchase recording while the site is in waitlist mode", async () => {
    // arrange
    const logger = createLogger();
    const handles = { ...createHandles({ WAITLIST_MODE: true }), logger };
    const paidSession = await openCheckoutSession(handles.paymentCheckout);
    const { feature } = composeCoachingSalesFeature({
      ...handles,
      paymentEvents: {
        verify: async () => ({
          kind: "checkout_completed",
          eventId: "evt_1",
          session: {
            id: paidSession.id,
            customerId: "cus_1",
            subscriptionId: "sub_1",
            paymentIntentId: null,
            amountCents: 44700,
            currency: "eur",
            customerEmail: "ana@example.com",
            paidAt: new Date("2026-10-20T10:00:00.000Z"),
            metadata: { purpose: "coaching-subscription" },
          },
        }),
      },
    });

    // act
    const response = await feature.stripeWebhooks.handleEvent(
      new Request("https://evoa.fit/api/stripe/webhooks", {
        body: "{}",
        headers: { "stripe-signature": "t=1,v1=signed" },
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      "Payment event was not recorded.",
      {
        errorCategory: "payment_event_rejected",
        eventId: "evt_1",
        reason: "call_not_found",
      },
    );
  });
});

describe("composeCoachingSalesFeature buyer controllers", () => {
  it("hides the bundle page, its link resolution and the checkout while the site is in waitlist mode", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const loading = feature.checkouts.loadBundlePageShell();
    const resolution = await feature.checkouts.resolveBundlePage(
      createRequestArgs({ request: bundlePageRequest("raw-token-value") }),
    );
    const checkout = await feature.checkouts.startCheckout(
      createRequestArgs({ request: checkoutRequest() }),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(resolution.status).toBe(404);
    expect(checkout.status).toBe(404);
  });
});

function bundlePageRequest(token: string): Request {
  return new Request("https://evoa.fit/api/coaching-sales/bundle-page", {
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function checkoutRequest(): Request {
  return new Request("https://evoa.fit/api/coaching-sales/checkouts", {
    body: new URLSearchParams({
      bundleId: "3-months",
      startChoice: "immediate",
      token: "raw-token-value",
    }),
    method: "POST",
  });
}

function coachSendsPaymentLinkArgs() {
  return coachArgs(
    new Request("https://evoa.fit/api/coaching-sales/payment-links", {
      body: JSON.stringify({ assessmentCallId: CALL_ID }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
}

function coachArgs(request: Request) {
  return createRequestArgs({
    session: {
      account: { authSubjectId: "user_1", id: "acct_1", role: "COACH" },
      kind: "authenticated",
    },
    request,
  });
}

async function openCheckoutSession(
  paymentCheckout: PaymentCheckout,
): Promise<{ id: string }> {
  const customer = await paymentCheckout.createCustomer({
    email: "ana@example.com",
    assessmentCallId: CALL_ID,
  });

  return paymentCheckout.createSession({
    customerId: customer.id,
    bundle: {
      id: "3-months",
      title: "3 Months",
      months: 3,
      amountCents: 44700,
    },
    currency: "eur",
    metadata: {
      purpose: "coaching-subscription",
      assessmentCallId: CALL_ID,
      bundleId: "3-months",
      tier: "regular",
      startChoice: "waiting",
    },
    successUrl:
      "https://evoa.fit/checkout/complete?session={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://evoa.fit/select-bundle",
  });
}

function createHandles(
  featureFlags: FeatureFlagSet,
): CoachingSalesFeatureHandles {
  const payments = createPayments({ PAYMENTS_PROVIDER: "memory" });

  return {
    appBasePath: "/eli-coach-platform",
    emailAcceptance: createEmailAcceptance("allowed"),
    assessmentCallReader: { findById: async () => null },
    clientIdentities: {
      findByClientId: async () => null,
      findByClientIds: async () => [],
    },
    clientIds: { generate: () => "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22" },
    clientJourneys: { findByAuthSubjectId: async () => null },
    clientReach: { findByAuthSubjectId: async () => null },
    clock: { now: () => new Date("2026-10-20T10:00:00.000Z") },
    coachEmail: "eli@evoa.fit",
    coachingEnds: [{ coachingEnds: async () => undefined }],
    coachingPeriods: [
      {
        paidThroughExtended: async () => undefined,
        programStarted: async () => undefined,
      },
    ],
    contactEmail: "contact@evoa.fit",
    database: createUnreachableDatabase(),
    featureFlags: { execute: async () => featureFlags },
    linkTokens: {
      generator: createTokenGenerator(),
      hasher: createTokenHasher(),
    },
    logger: createLogger(),
    openClientProfile: async () => undefined,
    paidClientAdmission: { admit: async () => undefined },
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentEvents: payments.events,
    paymentSubscriptions: payments.subscriptions,
    pricingEligibility: {
      tierForEmail: async () => "regular",
      tiersForEmails: async () => new Map(),
    },
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
    webhookSigningSecret: "whsec_unit",
    writeClient: async () => {
      throw new Error("no client expected");
    },
    writeCoachingStanding: async () => undefined,
  };
}

function createLogger() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
}

function createUnreachableDatabase(): DatabaseClient {
  const unreachable = () => {
    throw new Error("database down");
  };

  const database = {
    insert: unreachable,
    select: unreachable,
    transaction: (work: (transaction: unknown) => Promise<unknown>) =>
      work(database),
    update: unreachable,
  } as unknown as DatabaseClient;

  return database;
}
