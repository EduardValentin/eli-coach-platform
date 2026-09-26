import type { DatabaseClient } from "@eli-coach-platform/db";
import type { FeatureFlagSet } from "@eli-coach-platform/domain/feature-flag";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { createPaymentCheckout } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

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
    const sending = await feature.useCases.sendPaymentLink.execute({
      assessmentCallId: CALL_ID,
    });

    // assert
    expect(sending).toEqual({ status: "closed" });
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
    const confirmation =
      await feature.useCases.readCheckoutConfirmation.execute("cs_test_1");
    const checkout = await feature.useCases.startCheckout.execute({
      rawToken: "raw-token-value",
      bundleId: "3-months",
      startChoice: "immediate",
      successUrl: "https://evoa.fit/checkout/complete",
      cancelUrl: "https://evoa.fit/select-bundle",
    });

    // assert
    expect(confirmation).toEqual({ status: "closed" });
    expect(checkout).toEqual({ status: "closed" });
    expect(incidents.salesModeReadFailed).toHaveBeenCalledTimes(2);
  });

  it("answers a short token as invalid without reading any link", async () => {
    // arrange
    const { feature } = composeCoachingSalesFeature(createHandles({}));

    // act
    const resolution = await feature.useCases.resolvePaymentLink.execute("abc");

    // assert
    expect(resolution).toEqual({ status: "invalid" });
  });

  it("keeps recording completed checkouts while the site is in waitlist mode", async () => {
    // arrange
    const incidents = createIncidents();
    const { feature } = composeCoachingSalesFeature({
      ...createHandles({ WAITLIST_MODE: true }),
      incidents,
    });

    // act
    const recording = await feature.useCases.recordCheckoutCompleted.execute({
      eventId: "evt_1",
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
    });

    // assert
    expect(recording).toEqual({ status: "call_not_found" });
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
  });

  it("publishes the webhook signing secret and payment events for the webhook", () => {
    // arrange
    const handles = createHandles({});

    // act
    const { feature } = composeCoachingSalesFeature(handles);

    // assert
    expect(feature.webhookSigningSecret).toBe("whsec_unit");
    expect(feature.paymentEvents).toBe(handles.paymentEvents);
  });
});

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
