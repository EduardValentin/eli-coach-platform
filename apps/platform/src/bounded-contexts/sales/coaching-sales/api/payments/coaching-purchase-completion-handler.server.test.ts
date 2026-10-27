import type {
  RecordCheckoutCompletedUseCase,
  RefreshPaymentCardUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { PaidCheckoutSession } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { CoachingPurchaseCompletionHandler } from "./coaching-purchase-completion-handler.server";

const PAID_AT = new Date("2026-09-27T10:00:00.000Z");

type RecordOutcome = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
>;

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

const RECORDED: RecordOutcome = {
  status: "recorded",
  paymentCustomerId: "cus_1",
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

  it.each<[RecordOutcome, string]>([
    [RECORDED, "recorded"],
    [{ status: "duplicate", paymentCustomerId: "cus_1" }, "duplicate"],
    [{ status: "already_paid" }, "ignored"],
    [{ status: "call_not_found" }, "ignored"],
    [{ status: "unreadable_checkout" }, "ignored"],
  ])(
    "hands the notified session id and event id to purchase recording and answers %o as %s",
    async (recorded, expected) => {
      // arrange
      const { handler, recordCompletion } = createHandler(recorded);

      // act
      const outcome = await handler.handle("evt_1", notifiedSession);

      // assert
      expect(outcome).toBe(expected);
      expect(recordCompletion).toHaveBeenCalledWith({
        eventId: "evt_1",
        checkoutSessionId: "cs_test_1",
      });
    },
  );

  it.each<RecordOutcome>([
    RECORDED,
    { status: "duplicate", paymentCustomerId: "cus_1" },
  ])(
    "mirrors the card on file of her payment customer once the purchase answers %o",
    async (recorded) => {
      // arrange
      const { handler, refreshCard } = createHandler(recorded);

      // act
      await handler.handle("evt_1", notifiedSession);

      // assert
      expect(refreshCard).toHaveBeenCalledWith({ paymentCustomerId: "cus_1" });
    },
  );

  it.each<RecordOutcome>([
    { status: "already_paid" },
    { status: "call_not_found" },
    { status: "unreadable_checkout" },
  ])("mirrors no card when the purchase answers %o", async (recorded) => {
    // arrange
    const { handler, refreshCard } = createHandler(recorded);

    // act
    await handler.handle("evt_1", notifiedSession);

    // assert
    expect(refreshCard).not.toHaveBeenCalled();
  });

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
});

function createHandler(outcome: RecordOutcome = RECORDED) {
  const recordCompletion = vi.fn().mockResolvedValue(outcome);
  const refreshCard = vi.fn().mockResolvedValue(undefined);

  const handler = new CoachingPurchaseCompletionHandler({
    recordCheckoutCompleted: {
      execute: recordCompletion,
    } as unknown as RecordCheckoutCompletedUseCase,
    refreshPaymentCard: {
      execute: refreshCard,
    } as unknown as RefreshPaymentCardUseCase,
  });

  return { handler, recordCompletion, refreshCard };
}
