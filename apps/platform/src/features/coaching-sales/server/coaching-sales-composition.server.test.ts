import type { DatabaseClient } from "@eli-coach-platform/db";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createPaymentCheckout } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import {
  composeCoachingSalesFeature,
  type CoachingSalesFeatureHandles,
} from "./coaching-sales-composition.server";

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
    const incidents = createIncidents();
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({}),
      featureFlags: {
        execute: async () => {
          throw new Error("database down");
        },
      },
      incidents,
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
    expect(incidents.salesModeReadFailed).toHaveBeenCalledTimes(2);
  });

  it("answers a short token with the call-first page without reading any link", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(createHandles({}));

    // act
    const page = await feature.checkouts.loadBundlePage(
      createRequestArgs({
        request: new Request("https://evoa.fit/select-bundle?token=abc"),
      }),
    );

    // assert
    expect(page.data).toMatchObject({ state: "call-first" });
  });

  it("keeps recording completed checkouts while the site is in waitlist mode", async () => {
    // arrange
    const incidents = createIncidents();
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({ WAITLIST_MODE: true }),
      incidents,
      paymentEvents: {
        verify: async () => ({
          kind: "checkout_completed",
          eventId: "evt_1",
          completion: {
            checkoutSessionId: "cs_test_1",
            paymentCustomerId: "cus_1",
            paymentSubscriptionId: "sub_1",
            amountCents: 44700,
            currency: "eur",
            customerEmail: "ana@example.com",
            paidAt: new Date("2026-10-20T10:00:00.000Z"),
            assessmentCallId: CALL_ID,
            bundleId: "3-months",
            tier: "regular",
            startChoice: "waiting",
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
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
  });
});

describe("composeCoachingSalesFeature buyer controllers", () => {
  it("hides the bundle page and the checkout while the site is in waitlist mode", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const loading = feature.checkouts.loadBundlePage(
      createRequestArgs({
        request: new Request("https://evoa.fit/select-bundle?token=abc"),
      }),
    );
    const checkout = await feature.checkouts.startCheckout(
      createRequestArgs({ request: checkoutRequest() }),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
    expect(checkout.status).toBe(404);
  });

  it("answers the webhook with 503 when no signing secret is configured", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({}),
      webhookSigningSecret: undefined,
    });

    // act
    const response = await feature.stripeWebhooks.handleEvent(
      new Request("https://evoa.fit/api/stripe/webhooks", {
        body: "{}",
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(503);
  });

  it("keeps the webhook reachable while the site is in waitlist mode", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(
      createHandles({ WAITLIST_MODE: true }),
    );

    // act
    const response = await feature.stripeWebhooks.handleEvent(
      new Request("https://evoa.fit/api/stripe/webhooks", {
        body: "{}",
        method: "POST",
      }),
    );

    // assert
    expect(response.status).toBe(400);
  });
});

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
  return createRequestArgs({
    contexts: [
      contextEntry(sessionContext, {
        account: { authSubjectId: "user_1", id: "acct_1", role: "COACH" },
        kind: "authenticated",
      }),
    ],
    request: new Request("https://evoa.fit/api/coaching-sales/payment-links", {
      body: JSON.stringify({ assessmentCallId: CALL_ID }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  });
}

function createHandles(
  featureFlags: FeatureFlagSet,
): CoachingSalesFeatureHandles {
  return {
    appBasePath: "/eli-coach-platform",
    assessmentCallReader: { findById: async () => null },
    clock: { now: () => new Date("2026-10-20T10:00:00.000Z") },
    contactEmail: "contact@evoa.fit",
    database: createUnreachableDatabase(),
    featureFlags: { execute: async () => featureFlags },
    incidents: createIncidents(),
    paymentCheckout: createPaymentCheckout({ PAYMENTS_PROVIDER: "memory" }),
    paymentEvents: { verify: async () => ({ kind: "invalid" }) },
    pricingEligibility: { tierForEmail: async () => "regular" },
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
    webhookSigningSecret: "whsec_unit",
  };
}

function createIncidents() {
  return {
    paymentEventRejected: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
    salesModeReadFailed: vi.fn(),
  };
}

function createUnreachableDatabase(): DatabaseClient {
  const unreachable = () => {
    throw new Error("database down");
  };

  return {
    insert: unreachable,
    select: unreachable,
    transaction: unreachable,
    update: unreachable,
  } as unknown as DatabaseClient;
}
