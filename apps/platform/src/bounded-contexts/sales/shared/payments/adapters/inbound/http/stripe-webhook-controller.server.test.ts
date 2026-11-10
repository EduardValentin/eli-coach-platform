import type {
  PaidCheckoutSession,
  PaymentCardChange,
  PaymentEventVerdict,
  PaymentRefund,
  PaymentSubscriptionChange,
} from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";
import type { PaymentCompletionHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-completion-handler-port.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-events-port.server";
import type { PaymentRefundHandlerPort } from "~/bounded-contexts/sales/shared/payments/adapters/inbound/http/payment-refund-handler-port.server";
import type { UnitOfWork } from "~/shared/http/unit-of-work";
import { describe, expect, it, vi } from "vitest";

import { StripeWebhookController } from "./stripe-webhook-controller.server";

const SIGNING_SECRET = "whsec_test_signing_secret";
const RAW_BODY = '{"id":"evt_1","type":"checkout.session.completed"}';
const SIGNATURE = "t=1,v1=abc";

type HandlerOutcome = Awaited<
  ReturnType<PaymentCompletionHandlerPort["handle"]>
>;

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
  standing: "ended",
  previousStanding: null,
  scheduledEndAt: null,
  scheduledEndChanged: false,
  endedAt: new Date("2026-10-20T10:00:00.000Z"),
  occurredAt: new Date("2026-10-20T10:00:00.000Z"),
};

const chargeRefund: PaymentRefund = {
  kind: "charge_refund",
  paymentIntentId: "pi_1",
  chargeCents: 44700,
  refundedCents: 44700,
  currency: "eur",
  refundedAt: new Date("2026-10-20T10:00:00.000Z"),
};

const cardAttached: PaymentCardChange = {
  kind: "attached",
  customerId: "cus_1",
  paymentMethodId: "pm_visa",
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
};

describe("StripeWebhookController", () => {
  it("answers 503 without reading the event when no signing secret is configured", async () => {
    // arrange
    const { stripeWebhookController, coachingHandler, verify } =
      createController({
        signingSecret: undefined,
        verdict: { kind: "ignored" },
      });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it("verifies the raw body against the signature header", async () => {
    // arrange
    const { stripeWebhookController, verify } = createController({
      verdict: { kind: "ignored" },
    });

    // act
    await stripeWebhookController.handleEvent(createWebhookRequest());

    // assert
    expect(verify).toHaveBeenCalledWith(RAW_BODY, SIGNATURE);
  });

  it("refuses a body over the size limit without verifying it", async () => {
    // arrange
    const { stripeWebhookController, verify } = createController({
      verdict: { kind: "ignored" },
    });
    const request = new Request("https://evoa.example/api/stripe/webhooks", {
      body: "x".repeat(512 * 1024 + 1),
      headers: { "stripe-signature": SIGNATURE },
      method: "POST",
    });

    // act
    const response = await stripeWebhookController.handleEvent(request);

    // assert
    expect(response.status).toBe(413);
    expect(verify).not.toHaveBeenCalled();
  });

  it("refuses an event whose signature does not verify", async () => {
    // arrange
    const { stripeWebhookController, coachingHandler } = createController({
      verdict: { kind: "invalid" },
    });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(SIGNING_SECRET);
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it("acknowledges an event it does not act on", async () => {
    // arrange
    const { stripeWebhookController, coachingHandler } = createController({
      verdict: { kind: "ignored" },
    });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(200);
    expect(coachingHandler.handle).not.toHaveBeenCalled();
  });

  it.each<HandlerOutcome>(["recorded", "duplicate", "ignored"])(
    "hands a paid session to the handler of its purpose and acknowledges the %s outcome",
    async (outcome) => {
      // arrange
      const { stripeWebhookController, coachingHandler, incidents } =
        createController({
          outcome,
          verdict: {
            kind: "checkout_completed",
            eventId: "evt_1",
            session: coachingSession,
          },
        });

      // act
      const response = await stripeWebhookController.handleEvent(
        createWebhookRequest(),
      );

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
      const { stripeWebhookController, coachingHandler, incidents } =
        createController({
          verdict: {
            kind: "checkout_completed",
            eventId: "evt_1",
            session: paidSession(metadata),
          },
        });

      // act
      const response = await stripeWebhookController.handleEvent(
        createWebhookRequest(),
      );

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
    const { stripeWebhookController, subscriptionHandler, coachingHandler } =
      createController({
        verdict: {
          kind: "subscription_changed",
          eventId: "evt_deleted",
          purpose: "coaching-subscription",
          change: subscriptionDeletion,
        },
      });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

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
      const { stripeWebhookController, subscriptionHandler, incidents } =
        createController({
          verdict: {
            kind: "subscription_changed",
            eventId: "evt_deleted",
            purpose,
            change: subscriptionDeletion,
          },
        });

      // act
      const response = await stripeWebhookController.handleEvent(
        createWebhookRequest(),
      );

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
    const { stripeWebhookController, subscriptionHandler, incidents } =
      createController({
        verdict: {
          kind: "subscription_changed",
          eventId: "evt_deleted",
          purpose: "coaching-subscription",
          change: subscriptionDeletion,
        },
      });
    subscriptionHandler.handle.mockRejectedValue(new RangeError("stale"));

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(500);
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      error: expect.any(RangeError),
      eventId: "evt_deleted",
      handler: "coaching-subscription",
    });
  });
});

describe("StripeWebhookController with a refunded charge", () => {
  it("stops at the first refund handler that owns the refund and acknowledges it", async () => {
    // arrange
    const {
      stripeWebhookController,
      storeRefundHandler,
      subscriptionRefundHandler,
      incidents,
    } = createController({
      verdict: {
        kind: "charge_refunded",
        eventId: "evt_refunded",
        refund: chargeRefund,
      },
    });
    storeRefundHandler.handle.mockResolvedValue("recorded");

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(200);
    expect(storeRefundHandler.handle).toHaveBeenCalledWith(
      "evt_refunded",
      chargeRefund,
    );
    expect(subscriptionRefundHandler.handle).not.toHaveBeenCalled();
    expect(incidents.paymentEventUnrouted).not.toHaveBeenCalled();
  });

  it("offers a refund one handler does not own to the next one", async () => {
    // arrange
    const { stripeWebhookController, subscriptionRefundHandler, incidents } =
      createController({
        verdict: {
          kind: "charge_refunded",
          eventId: "evt_refunded",
          refund: chargeRefund,
        },
      });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(200);
    expect(subscriptionRefundHandler.handle).toHaveBeenCalledWith(
      "evt_refunded",
      chargeRefund,
    );
    expect(incidents.paymentEventUnrouted).not.toHaveBeenCalled();
  });

  it("acknowledges a refund no handler owns and reports it unrouted", async () => {
    // arrange
    const { stripeWebhookController, subscriptionRefundHandler, incidents } =
      createController({
        verdict: {
          kind: "charge_refunded",
          eventId: "evt_refunded",
          refund: chargeRefund,
        },
      });
    subscriptionRefundHandler.handle.mockResolvedValue("unowned");

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(200);
    expect(incidents.paymentEventUnrouted).toHaveBeenCalledWith({
      eventId: "evt_refunded",
      purpose: null,
    });
  });

  it("offers the refund to every handler inside one unit of work", async () => {
    // arrange
    const events: string[] = [];
    const {
      stripeWebhookController,
      storeRefundHandler,
      subscriptionRefundHandler,
    } = createController({
      verdict: {
        kind: "charge_refunded",
        eventId: "evt_refunded",
        refund: chargeRefund,
      },
      unitOfWork: async (work) => {
        events.push("unit-of-work-opened");
        const outcome = await work();
        events.push("unit-of-work-committed");
        return outcome;
      },
    });
    storeRefundHandler.handle.mockImplementation(async () => {
      events.push("store");
      return "unowned";
    });
    subscriptionRefundHandler.handle.mockImplementation(async () => {
      events.push("subscriptions");
      return "recorded";
    });

    // act
    await stripeWebhookController.handleEvent(createWebhookRequest());

    // assert
    expect(events).toEqual([
      "unit-of-work-opened",
      "store",
      "subscriptions",
      "unit-of-work-committed",
    ]);
  });

  it("answers 500 and reports the refunds handler when one fails", async () => {
    // arrange
    const {
      stripeWebhookController,
      storeRefundHandler,
      subscriptionRefundHandler,
      incidents,
    } = createController({
      verdict: {
        kind: "charge_refunded",
        eventId: "evt_refunded",
        refund: chargeRefund,
      },
    });
    storeRefundHandler.handle.mockRejectedValue(new Error("database down"));

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(500);
    expect(subscriptionRefundHandler.handle).not.toHaveBeenCalled();
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      error: expect.any(Error),
      eventId: "evt_refunded",
      handler: "charge-refunds",
    });
    expect(incidents.paymentEventUnrouted).not.toHaveBeenCalled();
  });
});

describe("StripeWebhookController with a card change", () => {
  it("hands the change to the one card handler and acknowledges it", async () => {
    // arrange
    const { stripeWebhookController, cardHandler } = createController({
      verdict: {
        kind: "payment_method_changed",
        eventId: "evt_card",
        change: cardAttached,
      },
    });

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(200);
    expect(cardHandler.handle).toHaveBeenCalledWith("evt_card", cardAttached);
  });

  it("answers 500 and reports the card handler when it fails", async () => {
    // arrange
    const { stripeWebhookController, cardHandler, incidents } =
      createController({
        verdict: {
          kind: "payment_method_changed",
          eventId: "evt_card",
          change: cardAttached,
        },
      });
    cardHandler.handle.mockRejectedValue(new Error("database down"));

    // act
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(500);
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      error: expect.any(Error),
      eventId: "evt_card",
      handler: "payment-cards",
    });
  });
});

describe("StripeWebhookController with a paid session without a customer", () => {
  it("reports it unrouted when its purpose names no handler", async () => {
    // arrange
    const { stripeWebhookController, coachingHandler, incidents } =
      createController({
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
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

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
    const { stripeWebhookController, coachingHandler, incidents } =
      createController({
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
    const response = await stripeWebhookController.handleEvent(
      createWebhookRequest(),
    );

    // assert
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
    expect(incidents.paymentEventHandlingFailed).toHaveBeenCalledWith({
      error: expect.any(TypeError),
      eventId: "evt_failing",
      handler: "coaching-subscription",
    });
  });
});

function createController(options: {
  outcome?: HandlerOutcome;
  signingSecret?: string | undefined;
  unitOfWork?: UnitOfWork;
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
  const storeRefundHandler = {
    handle: vi
      .fn<PaymentRefundHandlerPort["handle"]>()
      .mockResolvedValue("unowned"),
  };
  const subscriptionRefundHandler = {
    handle: vi
      .fn<PaymentRefundHandlerPort["handle"]>()
      .mockResolvedValue("recorded"),
  };
  const cardHandler = { handle: vi.fn().mockResolvedValue("recorded") };
  const incidents = {
    paymentEventHandlingFailed: vi.fn(),
    paymentEventUnrouted: vi.fn(),
  };
  const paymentEventsPort: PaymentEventsPort = { verify };
  const stripeWebhookController = new StripeWebhookController({
    unitOfWork: options.unitOfWork ?? ((work) => work()),
    paymentCardHandlerPort: cardHandler,
    completionHandlersByPurpose: new Map([
      [coachingHandler.purpose, coachingHandler],
    ]),
    paymentWebhookIncidentsPort: incidents,
    paymentEventsPort,
    paymentRefundHandlers: [storeRefundHandler, subscriptionRefundHandler],
    subscriptionChangeHandlersByPurpose: new Map([
      [subscriptionHandler.purpose, subscriptionHandler],
    ]),
    signingSecret:
      "signingSecret" in options ? options.signingSecret : SIGNING_SECRET,
  });

  return {
    cardHandler,
    coachingHandler,
    stripeWebhookController,
    incidents,
    storeRefundHandler,
    subscriptionHandler,
    subscriptionRefundHandler,
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
