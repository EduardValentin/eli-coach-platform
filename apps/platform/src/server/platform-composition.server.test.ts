import { loadRuntimeEnvironment } from "@eli-coach-platform/config/runtime";
import type {
  PaymentCompletionHandler,
  PaymentEvents,
  PaymentSubscriptionChangeHandler,
} from "@eli-coach-platform/infrastructure/payments/server";
import { CLERK_TEST_ENVIRONMENT } from "@eli-coach-platform/test-support";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { composePlatformFeature } from "./platform-composition.server";

const storeAssetRoot = mkdtempSync(
  join(tmpdir(), "eli-coach-platform-composition-"),
);

const PAID_SESSION = {
  id: "cs_test_1",
  customerId: "cus_1",
  subscriptionId: "sub_1",
  paymentIntentId: null,
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-27T10:00:00.000Z"),
  metadata: { purpose: "coaching-subscription" },
};

function createRuntimeEnvironment() {
  return loadRuntimeEnvironment({
    APP_NAME: "eli-coach-platform",
    ...CLERK_TEST_ENVIRONMENT,
    ENVIRONMENT: "local",
    MANAGEMENT_API_SECRET: "unit-test-management-api-secret-value",
    NODE_ENV: "development",
    PUBLIC_APP_URL: "https://eli.example",
    STORE_ASSET_ROOT: storeAssetRoot,
  });
}

function createHandler(purpose: string): PaymentCompletionHandler {
  return { purpose, handle: vi.fn().mockResolvedValue("recorded") };
}

function createChangeHandler(
  purpose: string,
): PaymentSubscriptionChangeHandler {
  return { purpose, handle: vi.fn().mockResolvedValue("recorded") };
}

function composeWith(options: {
  paymentCompletionHandlers: readonly PaymentCompletionHandler[];
  paymentEvents?: PaymentEvents;
  paymentSubscriptionChangeHandlers?: readonly PaymentSubscriptionChangeHandler[];
}) {
  return composePlatformFeature({
    app: createRuntimeEnvironment(),
    botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
    featureFlags: { execute: async () => ({ WAITLIST_MODE: true }) },
    incidents: {
      paymentEventHandlingFailed: vi.fn(),
      paymentEventUnrouted: vi.fn(),
    },
    paymentCompletionHandlers: options.paymentCompletionHandlers,
    paymentEvents: options.paymentEvents ?? {
      verify: async () => ({ kind: "invalid" }),
    },
    paymentRefundHandler: { handle: vi.fn().mockResolvedValue("recorded") },
    paymentSubscriptionChangeHandlers:
      options.paymentSubscriptionChangeHandlers ?? [],
    version: "dev",
    webhookSigningSecret: "whsec_unit",
  });
}

function stripeEventRequest(): Request {
  return new Request("https://eli.example/api/stripe/webhooks", {
    body: "{}",
    headers: { "stripe-signature": "t=1,v1=signed" },
    method: "POST",
  });
}

describe("composePlatformFeature", () => {
  afterAll(async () => {
    await rm(storeAssetRoot, { force: true, recursive: true });
  });

  it("reports readiness on a local environment without a database", async () => {
    // arrange
    const feature = composeWith({ paymentCompletionHandlers: [] });

    // act
    const response = feature.readyz.getStatus();

    // assert
    expect(response.status).toBe(200);
  });

  it("routes a paid session from the Stripe webhook to the handler of its purpose", async () => {
    // arrange
    const coaching = createHandler("coaching-subscription");
    const store = createHandler("store-order");
    const feature = composeWith({
      paymentCompletionHandlers: [store, coaching],
      paymentEvents: {
        verify: async () => ({
          kind: "checkout_completed",
          eventId: "evt_1",
          session: PAID_SESSION,
        }),
      },
    });

    // act
    const response =
      await feature.stripeWebhooks.handleEvent(stripeEventRequest());

    // assert
    expect(response.status).toBe(200);
    expect(coaching.handle).toHaveBeenCalledWith("evt_1", PAID_SESSION);
    expect(store.handle).not.toHaveBeenCalled();
  });

  it("routes a subscription change from the Stripe webhook to the handler of its purpose", async () => {
    // arrange
    const coaching = createChangeHandler("coaching-subscription");
    const store = createChangeHandler("store-order");
    const change = {
      kind: "invoice_outcome" as const,
      subscriptionId: "sub_1",
      customerId: "cus_1",
      outcome: "failed" as const,
      invoiceReason: "renewal" as const,
      occurredAt: new Date("2026-10-20T10:00:00.000Z"),
    };
    const feature = composeWith({
      paymentCompletionHandlers: [],
      paymentSubscriptionChangeHandlers: [store, coaching],
      paymentEvents: {
        verify: async () => ({
          kind: "subscription_changed",
          eventId: "evt_2",
          purpose: "coaching-subscription",
          change,
        }),
      },
    });

    // act
    const response =
      await feature.stripeWebhooks.handleEvent(stripeEventRequest());

    // assert
    expect(response.status).toBe(200);
    expect(coaching.handle).toHaveBeenCalledWith("evt_2", change);
    expect(store.handle).not.toHaveBeenCalled();
  });

  it("refuses two subscription change handlers serving the same purpose", () => {
    // arrange
    const handlers = [
      createChangeHandler("coaching-subscription"),
      createChangeHandler("coaching-subscription"),
    ];

    // act
    const compose = () =>
      composeWith({
        paymentCompletionHandlers: [],
        paymentSubscriptionChangeHandlers: handlers,
      });

    // assert
    expect(compose).toThrow("coaching-subscription");
  });

  it("refuses two payment handlers serving the same purpose", () => {
    // arrange
    const handlers = [
      createHandler("coaching-subscription"),
      createHandler("coaching-subscription"),
    ];

    // act
    const compose = () => composeWith({ paymentCompletionHandlers: handlers });

    // assert
    expect(compose).toThrow("coaching-subscription");
  });
});
