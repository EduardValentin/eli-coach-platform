import type { DatabaseClient } from "@eli-coach-platform/db";
import type { PaymentCheckout } from "@eli-coach-platform/domain/coaching-subscription";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createPayments } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { writeReviewStamps } from "~/features/coaching-sales/data/client-journeys/review-stamps.server";

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
    const response = await feature.checkouts.resolveBundlePage(
      createRequestArgs({ request: bundlePageRequest("abc") }),
    );

    // assert
    expect(await response.json()).toMatchObject({ state: "call-first" });
  });

  it("hands a completed checkout to purchase recording while the site is in waitlist mode", async () => {
    // arrange
    const incidents = createIncidents();
    const sale = { ...createHandles({ WAITLIST_MODE: true }), incidents };
    const paidSession = await openCheckoutSession(sale.paymentCheckout);
    const { handles } = composeCoachingSalesFeature(sale);

    // act
    const outcome = await handles.paymentCompletionHandler.handle("evt_1", {
      id: paidSession.id,
      customerId: "cus_1",
      subscriptionId: "sub_1",
      paymentIntentId: null,
      amountCents: 44700,
      currency: "eur",
      customerEmail: "ana@example.com",
      paidAt: new Date("2026-10-20T10:00:00.000Z"),
      metadata: { purpose: "coaching-subscription" },
    });

    // assert
    expect(outcome).toBe("ignored");
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
  });
});

describe("composeCoachingSalesFeature invitation acceptance", () => {
  it("refuses a subject whose identity carries no invitation without reading any invitation", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const outcome = await handles.invitationAcceptance.accept({
      authSubjectId: "user_uninvited",
    });

    // assert
    expect(outcome).toBe("refused");
  });
});

describe("composeCoachingSalesFeature client onboarding handles", () => {
  it("reads the onboarding client from the clients table", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const reading = handles.onboardingClients.findByAuthSubjectId("user_ana");

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("reads the client's identity from the clients table", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const reading = handles.clientIdentities.findByClientId(
      "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    );

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("reads whether a client exists for her resources from the clients table", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const reading = handles.resourceClients.exists(
      "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
    );

    // assert
    await expect(reading).rejects.toThrow("database down");
  });

  it("stamps the submitted onboarding on the clients table", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const stamping =
      handles.onboardingSubmissionStamps.recordOnboardingSubmitted({
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        at: new Date("2026-10-20T10:00:00.000Z"),
      });

    // assert
    await expect(stamping).rejects.toThrow("database down");
  });

  it("projects the review stamps on the clients table", async () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const stamping = handles.onboardingReviewStamps.record({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      stamps: {
        reviewOpenedAt: new Date("2026-10-20T10:00:00.000Z"),
        detailsRequestedAt: null,
        detailsAnsweredAt: null,
        answersApprovedAt: null,
      },
    });

    // assert
    await expect(stamping).rejects.toThrow("database down");
  });

  it("hands out the review stamp writer other features call inside their own transaction", () => {
    // arrange
    const { handles } = composeCoachingSalesFeature(createHandles({}));

    // act
    const writer = handles.reviewStampWriter;

    // assert
    expect(writer).toBe(writeReviewStamps);
  });
});

describe("composeCoachingSalesFeature coach clients", () => {
  it("answers no clients and reports the failure when the roster cannot be read", async () => {
    // arrange
    const incidents = createIncidents();
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({}),
      incidents,
    });

    // act
    const roster = await feature.coachClients.loadRoster(
      coachArgs(new Request("https://evoa.fit/coach/clients")),
    );

    // assert
    expect(roster).toEqual({ clients: null });
    expect(incidents.rosterReadFailed).toHaveBeenCalledWith(
      new Error("database down"),
    );
  });

  it("re-sends an invitation through the clients table", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(createHandles({}));

    // act
    const resending = feature.coachClients.resendInvitation(
      coachArgs(
        new Request("https://evoa.fit/api/coaching-sales/invitation-resends", {
          body: JSON.stringify({
            clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      ),
    );

    // assert
    await expect(resending).rejects.toThrow("database down");
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
    contexts: [
      contextEntry(sessionContext, {
        account: { authSubjectId: "user_1", id: "acct_1", role: "COACH" },
        kind: "authenticated",
      }),
    ],
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
    assessmentCallReader: { findById: async () => null },
    clock: { now: () => new Date("2026-10-20T10:00:00.000Z") },
    coachEmail: "eli@evoa.fit",
    contactEmail: "contact@evoa.fit",
    database: createUnreachableDatabase(),
    featureFlags: { execute: async () => featureFlags },
    identityInvitations: {
      create: async () => {
        throw new Error("no identity invitation expected");
      },
      findInvitationIdForSubject: async () => null,
      replace: async () => {
        throw new Error("no identity invitation expected");
      },
    },
    incidents: createIncidents(),
    paymentCheckout: payments.checkout,
    paymentCustomerCards: payments.customerCards,
    paymentSubscriptions: payments.subscriptions,
    pricingEligibility: {
      tierForEmail: async () => "regular",
      tiersForEmails: async () => new Map(),
    },
    productEmail: new InMemoryProductEmail(),
    publicAppUrl: "https://evoa.fit",
  };
}

function createIncidents() {
  return {
    paymentCardRefreshFailed: vi.fn(),
    invitationEmailFailed: vi.fn(),
    invitationResendFailed: vi.fn(),
    invitationResent: vi.fn(),
    paymentCardEventMirrored: vi.fn(),
    paymentEventRejected: vi.fn(),
    paymentMethodSessionOpened: vi.fn(),
    programStartedNow: vi.fn(),
    refundNotificationFailed: vi.fn(),
    refundSettled: vi.fn(),
    renewalHoldApplied: vi.fn(),
    renewalHoldFailed: vi.fn(),
    subscriptionCancellationFailed: vi.fn(),
    subscriptionCancelled: vi.fn(),
    subscriptionEventReconciled: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
    rosterReadFailed: vi.fn(),
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
