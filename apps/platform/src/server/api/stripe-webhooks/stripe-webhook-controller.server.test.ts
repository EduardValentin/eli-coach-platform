import type {
  PaidCheckoutSession,
  PaymentCompletionHandler,
  PaymentEvents,
  PaymentEventVerdict,
  PaymentRefund,
  PaymentSubscriptionChange,
} from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { StripeWebhookController } from "./stripe-webhook-controller.server";

const SIGNING_SECRET = "whsec_test_signing_secret";
const RAW_BODY = '{"id":"evt_1","type":"checkout.session.completed"}';
const SIGNATURE = "t=1,v1=abc";

type HandlerOutcome = Awaited<ReturnType<PaymentCompletionHandler["handle"]>>;

function paidSession(metadata: Record<string, string>): PaidCheckoutSession {
  return {
    id: "cs_test_1",
    customerId: "cus_1",
    subscriptionId: "sub_1",
    paymentIntentId: null,
    amountCents: 44700,
    currency: "eur",
    customerEmail: "ana@example.com",
    paidAt: new Date("2026-09-26T10:00:00.000Z"),
    metadata,
  };
}

const coachingSession = paidSession({ purpose: "coaching-subscription" });

const subscriptionDeletion: PaymentSubscriptionChange = {
  kind: "subscription_state",
  subscriptionId: "sub_1",
  customerId: "cus_1",
  providerStatus: "canceled",
  previousProviderStatus: null,
  scheduledEndAt: null,
  scheduledEndChanged: false,
  endedAt: new Date("2026-10-20T10:00:00.000Z"),
  occurredAt: new Date("2026-10-20T10:00:00.000Z"),
};

const chargeRefund: PaymentRefund = {
  kind: "charge_refund",
  customerId: "cus_1",
  chargeCents: 44700,
  refundedCents: 44700,
  currency: "eur",
  refundedAt: new Date("2026-10-20T10:00:00.000Z"),
};

describe("StripeWebhookController", () => {
  it("answers 503 without reading the event when no signing secret is configured", async () => {
    // arrange
    const { controller, coachingHandler, verify } = createController({
      signingSecret: undefined,
      verdict: { kind: "ignored" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it("verifies the raw body against the signature header", async () => {
    // arrange
    const { controller, verify } = createController({
      verdict: { kind: "ignored" },
    });

    // act
    await controller.handleEvent(createWebhookRequest());

    // assert
    expect(verify).toHaveBeenCalledWith(RAW_BODY, SIGNATURE);
  });

  it("refuses a body over the size limit without verifying it", async () => {
    // arrange
    const { controller, verify } = createController({
      verdict: { kind: "ignored" },
    });
    const request = new Request("https://evoa.example/api/stripe/webhooks", {
      body: "x".repeat(512 * 1024 + 1),
      headers: { "stripe-signature": SIGNATURE },
      method: "POST",
    });

    // act
    const response = await controller.handleEvent(request);

    // assert
    expect(response.status).toBe(413);
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuses an event whose signature does not verify", async () => {
    // arrange
    const { controller, coachingHandler } = createController({
      verdict: { kind: "invalid" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(SIGNING_SECRET);
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it("acknowledges an event it does not act on", async () => {
    // arrange
    const { controller, coachingHandler } = createController({
      verdict: { kind: "ignored" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(200);
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it.each<HandlerOutcome>(["recorded", "duplicate", "ignored"])(
    "hands a paid session to the handler of its purpose and acknowledges the %s outcome",
    async (outcome) => {
      // arrange
      const { controller, coachingHandler, incidents } = createController({
        outcome,
        verdict: {
          kind: "checkout_completed",
          eventId: "evt_1",
          session: coachingSession,
        },
      });

      // act
      const response = await controller.handleEvent(createWebhookRequest());

      // assert
      expect(response.status).toBe(200);
      expect(coachingHandler.handle).toHaveBeenCalledWith(
        "evt_1",
        coachingSession,
      );
      expect(incidents.paymentEventUnrouted).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a purpose no handler serves", { purpose: "gift-card" }, "gift-card"],
    ["no purpose", {}, null],
  ])(
    "acknowledges a paid session with %s without handing it to any handler and reports it",
    async (_description, metadata, purpose) => {
      // arrange
      const { controller, coachingHandler, incidents } = createController({
        verdict: {
          kind: "checkout_completed",
          eventId: "evt_1",
          session: paidSession(metadata),
        },
      });

      // act
      const response = await controller.handleEvent(createWebhookRequest());

      // assert
      expect(response.status).toBe(200);
      expect(coachingHandler.handle).not.toHaveBeenCalled();
      expect(incidents.paymentEventUnrouted).toHaveBeenCalledWith({
        eventId: "evt_1",
        purpose,
      });
    },
  );
});

describe("StripeWebhookController with a subscription change", () => {
  it("hands the change to the subscription handler of its purpose and acknowledges it", async () => {
    // arrange
    const { controller, subscriptionHandler, coachingHandler } =
      createController({
        verdict: {
          kind: "subscription_changed",
          eventId: "evt_deleted",
          purpose: "coaching-subscription",
          change: subscriptionDeletion,
        },
      });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(200);
    expect(subscriptionHandler.handle).toHaveBeenCalledWith(
      "evt_deleted",
      subscriptionDeletion,
    );
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it.each([
    ["a purpose no handler serves", "gift-card"],
    ["no purpose", null],
  ])(
    "acknowledges a change with %s without handing it on and reports it",
    async (_description, purpose) => {
      // arrange
      const { controller, subscriptionHandler, incidents } = createController({
        verdict: {
          kind: "subscription_changed",
          eventId: "evt_deleted",
          purpose,
          change: subscriptionDeletion,
        },
      });

      // act
      const response = await controller.handleEvent(createWebhookRequest());

      // assert
      expect(response.status).toBe(200);
      expect(subscriptionHandler.handle).not.toHaveBeenCalled();
      expect(incidents.paymentEventUnrouted).toHaveBeenCalledWith({
        eventId: "evt_deleted",
        purpose,
      });
    },
  );

  it("answers 500 so Stripe redelivers when the subscription handler fails", async () => {
    // arrange
    const { controller, subscriptionHandler, incidents } = createController({
      verdict: {
        kind: "subscription_changed",
        eventId: "evt_deleted",
        purpose: "coaching-subscription",
        change: subscriptionDeletion,
      },
    });
    subscriptionHandler.handle.mockRejectedValue(new RangeError("stale"));

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(500);
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      errorClass: "RangeError",
      eventId: "evt_deleted",
      purpose: "coaching-subscription",
    });
  });
});

describe("StripeWebhookController with a refunded charge", () => {
  it("hands the refund to the one refund handler and acknowledges it", async () => {
    // arrange
    const { controller, refundHandler } = createController({
      verdict: {
        kind: "charge_refunded",
        eventId: "evt_refunded",
        refund: chargeRefund,
      },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(200);
    expect(refundHandler.handle).toHaveBeenCalledWith(
      "evt_refunded",
      chargeRefund,
    );
  });

  it("answers 500 and reports the refund owner when the refund handler fails", async () => {
    // arrange
    const { controller, refundHandler, incidents } = createController({
      verdict: {
        kind: "charge_refunded",
        eventId: "evt_refunded",
        refund: chargeRefund,
      },
    });
    refundHandler.handle.mockRejectedValue(new Error("database down"));

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(500);
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      errorClass: "Error",
      eventId: "evt_refunded",
      purpose: "refund",
    });
  });
});

describe("StripeWebhookController with a paid session without a customer", () => {
  it("reports it unrouted when its purpose names no handler", async () => {
    // arrange
    const { controller, coachingHandler, incidents } = createController({
      verdict: {
        kind: "checkout_completed",
        eventId: "evt_guest",
        session: {
          ...paidSession({ purpose: "store-order" }),
          customerId: null,
        },
      },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(200);
    expect(coachingHandler.handle).not.toHaveBeenCalled();
    expect(incidents.paymentEventUnrouted).toHaveBeenCalledWith({
      eventId: "evt_guest",
      purpose: "store-order",
    });
  });
});

describe("StripeWebhookController when the handler fails", () => {
  it("answers 500 so Stripe redelivers, reporting the event and the failure's kind but never its message", async () => {
    // arrange
    const { controller, coachingHandler, incidents } = createController({
      verdict: {
        kind: "checkout_completed",
        eventId: "evt_failing",
        session: coachingSession,
      },
    });
    coachingHandler.handle.mockRejectedValue(
      new TypeError(
        "Failed query: update ... params: https://accounts.evoa.fit/sign-up?__clerk_ticket=secret,ana@example.com",
      ),
    );

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      errorClass: "TypeError",
      eventId: "evt_failing",
      purpose: "coaching-subscription",
    });
  });
});

function createController(options: {
  outcome?: HandlerOutcome;
  signingSecret?: string | undefined;
  verdict: PaymentEventVerdict;
}) {
  const verify = vi.fn().mockResolvedValue(options.verdict);
  const coachingHandler = {
    purpose: "coaching-subscription",
    handle: vi.fn().mockResolvedValue(options.outcome ?? "recorded"),
  };
  const subscriptionHandler = {
    purpose: "coaching-subscription",
    handle: vi.fn().mockResolvedValue("recorded"),
  };
  const refundHandler = { handle: vi.fn().mockResolvedValue("recorded") };
  const incidents = {
    paymentEventHandlingFailed: vi.fn(),
    paymentEventUnrouted: vi.fn(),
  };
  const paymentEvents: PaymentEvents = { verify };
  const controller = new StripeWebhookController({
    completionHandlersByPurpose: new Map([
      [coachingHandler.purpose, coachingHandler],
    ]),
    incidents,
    paymentEvents,
    refundHandler,
    subscriptionChangeHandlersByPurpose: new Map([
      [subscriptionHandler.purpose, subscriptionHandler],
    ]),
    signingSecret:
      "signingSecret" in options ? options.signingSecret : SIGNING_SECRET,
  });

  return {
    coachingHandler,
    controller,
    incidents,
    refundHandler,
    subscriptionHandler,
    verify,
  };
}

function createWebhookRequest(): Request {
  return new Request("https://evoa.example/api/stripe/webhooks", {
    body: RAW_BODY,
    headers: { "stripe-signature": SIGNATURE },
    method: "POST",
  });
}
