import type {
  CheckoutCompletion,
  PaymentCheckout,
  RecordCheckoutCompletedUseCase,
  RefreshPaymentCardUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { PaidCheckoutSession } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { CoachingPurchaseCompletionHandler } from "./coaching-purchase-completion-handler.server";

const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const PAID_AT = new Date("2026-09-27T10:00:00.000Z");

type RecordOutcome = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
>;

type HandlerArrangement = {
  outcome?: RecordOutcome;
  completion?: CheckoutCompletion | null;
};

const notifiedSession: PaidCheckoutSession = {
  id: "cs_test_1",
  customerId: "cus_1",
  subscriptionId: "sub_1",
  paymentIntentId: null,
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: PAID_AT,
  metadata: { purpose: "coaching-subscription" },
};

const providerCompletion: CheckoutCompletion = {
  checkoutSessionId: "cs_test_1",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  paymentIntentId: "pi_1",
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: PAID_AT,
  assessmentCallId: CALL_ID,
  bundleId: "3-months",
  tier: "regular",
  startChoice: "waiting",
};

describe("CoachingPurchaseCompletionHandler", () => {
  it("serves the coaching subscription purpose", () => {
    // arrange
    const { handler } = createHandler();

    // act
    const purpose = handler.purpose;

    // assert
    expect(purpose).toBe("coaching-subscription");
  });

  it.each<[RecordOutcome["status"], string]>([
    ["recorded", "recorded"],
    ["duplicate", "duplicate"],
    ["already_paid", "ignored"],
    ["call_not_found", "ignored"],
  ])(
    "records the completion the provider answers for the notified session with its event id and answers %s as %s",
    async (status, expected) => {
      // arrange
      const { handler, incidents, paymentCheckout, recordCompletion } =
        createHandler({ outcome: { status } });

      // act
      const outcome = await handler.handle("evt_1", notifiedSession);

      // assert
      expect(outcome).toBe(expected);
      expect(paymentCheckout.findCompletedSession).toHaveBeenCalledWith(
        "cs_test_1",
      );
      expect(recordCompletion).toHaveBeenCalledWith({
        ...providerCompletion,
        eventId: "evt_1",
      });
      expect(incidents.paymentEventRejected).not.toHaveBeenCalled();
    },
  );

  it.each<RecordOutcome["status"]>(["recorded", "duplicate"])(
    "mirrors the card on file of her payment customer once the purchase answers %s",
    async (status) => {
      // arrange
      const { handler, refreshCard } = createHandler({ outcome: { status } });

      // act
      await handler.handle("evt_1", notifiedSession);

      // assert
      expect(refreshCard).toHaveBeenCalledWith({ paymentCustomerId: "cus_1" });
    },
  );

  it.each<RecordOutcome["status"]>(["already_paid", "call_not_found"])(
    "mirrors no card when the purchase answers %s",
    async (status) => {
      // arrange
      const { handler, refreshCard } = createHandler({ outcome: { status } });

      // act
      await handler.handle("evt_1", notifiedSession);

      // assert
      expect(refreshCard).not.toHaveBeenCalled();
    },
  );

  it("fails the delivery when the card on file cannot be mirrored, so the provider redelivers", async () => {
    // arrange
    const failure = new Error("provider down");
    const { handler, refreshCard } = createHandler();
    refreshCard.mockRejectedValue(failure);

    // act
    const handling = handler.handle("evt_1", notifiedSession);

    // assert
    await expect(handling).rejects.toBe(failure);
  });

  it("fails the delivery when the provider cannot be asked for the completion, so it redelivers", async () => {
    // arrange
    const failure = new Error("provider down");
    const { handler, paymentCheckout, recordCompletion } = createHandler();
    paymentCheckout.findCompletedSession.mockRejectedValue(failure);

    // act
    const handling = handler.handle("evt_1", notifiedSession);

    // assert
    await expect(handling).rejects.toBe(failure);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it("ignores a notified session the provider does not answer as a paid coaching checkout and reports it", async () => {
    // arrange
    const { handler, incidents, recordCompletion, refreshCard } = createHandler(
      { completion: null },
    );

    // act
    const outcome = await handler.handle("evt_1", notifiedSession);

    // assert
    expect(outcome).toBe("ignored");
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(refreshCard).not.toHaveBeenCalled();
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "unreadable_checkout",
    });
  });
});

function createHandler({
  outcome = { status: "recorded" },
  completion = providerCompletion,
}: HandlerArrangement = {}) {
  const recordCompletion = vi.fn().mockResolvedValue(outcome);
  const refreshCard = vi.fn().mockResolvedValue(undefined);
  const paymentCheckout = {
    createCustomer: vi.fn(),
    createSession: vi.fn(),
    expireSession: vi.fn(),
    findCompletedSession: vi.fn().mockResolvedValue(completion),
  } satisfies PaymentCheckout;
  const incidents = {
    paymentCardRefreshFailed: vi.fn(),
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
  };
  const handler = new CoachingPurchaseCompletionHandler({
    incidents,
    paymentCheckout,
    recordCheckoutCompleted: {
      execute: recordCompletion,
    } as unknown as RecordCheckoutCompletedUseCase,
    refreshPaymentCard: {
      execute: refreshCard,
    } as unknown as RefreshPaymentCardUseCase,
  });

  return { handler, incidents, paymentCheckout, recordCompletion, refreshCard };
}
