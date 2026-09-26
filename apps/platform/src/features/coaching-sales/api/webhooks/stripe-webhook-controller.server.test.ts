import type {
  CheckoutCompletion,
  RecordCheckoutCompletedUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  PaymentEvents,
  PaymentEventVerdict,
} from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { StripeWebhookController } from "./stripe-webhook-controller.server";

const SIGNING_SECRET = "whsec_test_signing_secret";
const RAW_BODY = '{"id":"evt_1","type":"checkout.session.completed"}';
const SIGNATURE = "t=1,v1=abc";

const completion: CheckoutCompletion = {
  checkoutSessionId: "cs_test_1",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-26T10:00:00.000Z"),
  assessmentCallId: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  bundleId: "3-months",
  tier: "regular",
  startChoice: "immediate",
};

type RecordOutcome = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
>;

describe("StripeWebhookController", () => {
  it("answers 503 without reading the event when no signing secret is configured", async () => {
    // arrange
    const { controller, recordCompletion, verify } = createController({
      signingSecret: undefined,
      verdict: { kind: "ignored" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
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
    const { controller, recordCompletion } = createController({
      verdict: { kind: "invalid" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(SIGNING_SECRET);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it("acknowledges an event it does not act on", async () => {
    // arrange
    const { controller, recordCompletion } = createController({
      verdict: { kind: "ignored" },
    });

    // act
    const response = await controller.handleEvent(createWebhookRequest());

    // assert
    expect(response.status).toBe(200);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it.each<RecordOutcome["status"]>([
    "recorded",
    "duplicate",
    "already_paid",
    "call_not_found",
  ])(
    "records a completed checkout with its event id and acknowledges the %s outcome",
    async (status) => {
      // arrange
      const { controller, recordCompletion } = createController({
        outcome: { status },
        verdict: { kind: "checkout_completed", eventId: "evt_1", completion },
      });

      // act
      const response = await controller.handleEvent(createWebhookRequest());

      // assert
      expect(response.status).toBe(200);
      expect(recordCompletion).toHaveBeenCalledWith({
        ...completion,
        eventId: "evt_1",
      });
    },
  );
});

function createController(options: {
  outcome?: RecordOutcome;
  signingSecret?: string | undefined;
  verdict: PaymentEventVerdict;
}) {
  const verify = vi.fn().mockResolvedValue(options.verdict);
  const recordCompletion = vi
    .fn()
    .mockResolvedValue(options.outcome ?? { status: "recorded" });
  const paymentEvents: PaymentEvents = { verify };
  const controller = new StripeWebhookController({
    paymentEvents,
    recordCheckoutCompleted: {
      execute: recordCompletion,
    } as unknown as RecordCheckoutCompletedUseCase,
    signingSecret:
      "signingSecret" in options ? options.signingSecret : SIGNING_SECRET,
  });

  return { controller, recordCompletion, verify };
}

function createWebhookRequest(): Request {
  return new Request("https://evoa.example/api/stripe/webhooks", {
    body: RAW_BODY,
    headers: { "stripe-signature": SIGNATURE },
    method: "POST",
  });
}
