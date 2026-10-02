import type { ReconcileSubscriptionEventUseCase } from "@eli-coach-platform/domain/coaching-subscription";
import type {
  PaymentRefund,
  PaymentSubscriptionChange,
} from "@eli-coach-platform/infrastructure/payments/server";
import { describe, expect, it, vi } from "vitest";

import { CoachingSubscriptionChangeHandler } from "./coaching-subscription-change-handler.server";

const OCCURRED_AT = new Date("2026-10-20T10:00:00.000Z");

type ReconcileStatus = Awaited<
  ReturnType<ReconcileSubscriptionEventUseCase["execute"]>
>["status"];

const deletion: PaymentSubscriptionChange = {
  kind: "subscription_state",
  subscriptionId: "sub_1",
  customerId: "cus_1",
  providerStatus: "canceled",
  previousProviderStatus: null,
  scheduledEndAt: null,
  scheduledEndChanged: false,
  endedAt: OCCURRED_AT,
  occurredAt: OCCURRED_AT,
};

const refund: PaymentRefund = {
  kind: "charge_refund",
  customerId: "cus_1",
  chargeCents: 44700,
  refundedCents: 44700,
  currency: "eur",
  refundedAt: OCCURRED_AT,
};

function createHandler(status: ReconcileStatus = "recorded") {
  const reconcile = vi.fn().mockResolvedValue({ status });
  const handler = new CoachingSubscriptionChangeHandler({
    reconcileSubscriptionEvent: {
      execute: reconcile,
    } as unknown as ReconcileSubscriptionEventUseCase,
  });

  return { handler, reconcile };
}

describe("CoachingSubscriptionChangeHandler", () => {
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

  it("reconciles a refunded charge against the customer's refunded total", async () => {
    // arrange
    const { handler, reconcile } = createHandler();

    // act
    await handler.handle("evt_2", refund);

    // assert
    expect(reconcile).toHaveBeenCalledWith({
      eventId: "evt_2",
      event: {
        kind: "charge-refunded",
        paymentCustomerId: "cus_1",
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
      providerStatus: "active",
      endedAt: null,
    });

    // assert
    expect(outcome).toBe("ignored");
    expect(reconcile).not.toHaveBeenCalled();
  });
});
