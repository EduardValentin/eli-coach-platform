import type { RecordCheckoutCompletedUseCase } from "@eli-coach-platform/domain/coaching-subscription";
import type { PaidCheckoutSession } from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { CoachingPurchaseCompletionHandler } from "./coaching-purchase-completion-handler.server";

const CALL_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const PAID_AT = new Date("2026-09-27T10:00:00.000Z");

type RecordOutcome = Awaited<
  ReturnType<RecordCheckoutCompletedUseCase["execute"]>
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
    paidAt: PAID_AT,
    metadata,
  };
}

const coachingMetadata = {
  purpose: "coaching-subscription",
  assessmentCallId: CALL_ID,
  bundleId: "3-months",
  months: "3",
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
    "records a paid coaching session with its event id and answers %s as %s",
    async (status, expected) => {
      // arrange
      const { handler, incidents, recordCompletion } = createHandler({
        status,
      });

      // act
      const outcome = await handler.handle(
        "evt_1",
        paidSession(coachingMetadata),
      );

      // assert
      expect(outcome).toBe(expected);
      expect(recordCompletion).toHaveBeenCalledWith({
        eventId: "evt_1",
        checkoutSessionId: "cs_test_1",
        paymentCustomerId: "cus_1",
        paymentSubscriptionId: "sub_1",
        amountCents: 44700,
        currency: "eur",
        customerEmail: "ana@example.com",
        paidAt: PAID_AT,
        assessmentCallId: CALL_ID,
        bundleId: "3-months",
        tier: "regular",
        startChoice: "waiting",
      });
      expect(incidents.paymentEventRejected).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "an unknown bundle",
      paidSession({ ...coachingMetadata, bundleId: "12-months" }),
    ],
    [
      "another purpose",
      paidSession({ ...coachingMetadata, purpose: "store-order" }),
    ],
    ["no customer", { ...paidSession(coachingMetadata), customerId: null }],
  ])(
    "ignores a paid session with %s and reports it",
    async (_description, session) => {
      // arrange
      const { handler, incidents, recordCompletion } = createHandler();

      // act
      const outcome = await handler.handle("evt_1", session);

      // assert
      expect(outcome).toBe("ignored");
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
        eventId: "evt_1",
        reason: "unreadable_checkout",
      });
    },
  );
});

function createHandler(outcome: RecordOutcome = { status: "recorded" }) {
  const recordCompletion = vi.fn().mockResolvedValue(outcome);
  const incidents = {
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
    recordCheckoutCompleted: {
      execute: recordCompletion,
    } as unknown as RecordCheckoutCompletedUseCase,
  });

  return { handler, incidents, recordCompletion };
}
