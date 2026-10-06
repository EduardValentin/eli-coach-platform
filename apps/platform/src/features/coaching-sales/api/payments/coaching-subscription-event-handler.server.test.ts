import type { ReconcileSubscriptionEventUseCase } from "@eli-coach-platform/domain/coaching-subscription";
import type {
  PaymentRefund,
  PaymentSubscriptionChange,
} from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { CoachingSubscriptionEventHandler } from "./coaching-subscription-event-handler.server";

const OCCURRED_AT = new Date("2026-10-20T10:00:00.000Z");

type ReconcileStatus = Awaited<
  ReturnType<ReconcileSubscriptionEventUseCase["execute"]>
>["status"];

const deletion: PaymentSubscriptionChange = {
  kind: "subscription_state",
  subscriptionId: "sub_1",
  customerId: "cus_1",
  standing: "ended",
  previousStanding: null,
  scheduledEndAt: null,
  scheduledEndChanged: false,
  endedAt: OCCURRED_AT,
  occurredAt: OCCURRED_AT,
};

const refund: PaymentRefund = {
  kind: "charge_refund",
  paymentIntentId: "pi_1",
  chargeCents: 44700,
  refundedCents: 44700,
  currency: "eur",
  refundedAt: OCCURRED_AT,
};

function createHandler(status: ReconcileStatus = "recorded") {
  const reconcile = vi.fn().mockResolvedValue({ status });
  const handler = new CoachingSubscriptionEventHandler({
    reconcileSubscriptionEvent: {
      execute: reconcile,
    } as unknown as ReconcileSubscriptionEventUseCase,
  });

  return { handler, reconcile };
}

describe("CoachingSubscriptionEventHandler", () => {
  it("serves the coaching subscription purpose", () => {
    // arrange
    const { handler } = createHandler();

    // act
    const purpose = handler.purpose;

    // assert
    expect(purpose).toBe("coaching-subscription");
  });

  it.each<ReconcileStatus>(["recorded", "duplicate", "ignored"])(
    "reconciles a subscription change as its domain event and answers %s",
    async (status) => {
      // arrange
      const { handler, reconcile } = createHandler(status);

      // act
      const outcome = await handler.handle("evt_1", deletion);

      // assert
      expect(outcome).toBe(status);
      expect(reconcile).toHaveBeenCalledWith({
        eventId: "evt_1",
        event: {
          kind: "ended",
          paymentSubscriptionId: "sub_1",
          endedAt: OCCURRED_AT,
        },
      });
    },
  );

  it("reconciles a refunded charge against the refunded total of its payment intent", async () => {
    // arrange
    const { handler, reconcile } = createHandler();

    // act
    await handler.handle("evt_2", refund);

    // assert
    expect(reconcile).toHaveBeenCalledWith({
      eventId: "evt_2",
      event: {
        kind: "charge-refunded",
        paymentIntentId: "pi_1",
        refundedCents: 44700,
        occurredAt: OCCURRED_AT,
      },
    });
  });

  it("ignores a change that means nothing to the coaching subscription", async () => {
    // arrange
    const { handler, reconcile } = createHandler();

    // act
    const outcome = await handler.handle("evt_3", {
      ...deletion,
      standing: "healthy",
      endedAt: null,
    });

    // assert
    expect(outcome).toBe("ignored");
    expect(reconcile).not.toHaveBeenCalled();
  });
});
