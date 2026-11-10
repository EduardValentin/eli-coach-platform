import { describe, expect, it, vi } from "vitest";

import type {
  RefundOrderResult,
  RefundOrderUseCase,
} from "~/bounded-contexts/sales/store/domain/order";
import type { PaymentRefund } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

import { StoreOrderRefundHandler } from "./store-order-refund-handler.server";

const refundedAt = new Date("2026-11-10T09:00:00.000Z");

const refund: PaymentRefund = {
  kind: "charge_refund",
  paymentIntentId: "pi_order",
  chargeCents: 6800,
  refundedCents: 1500,
  currency: "eur",
  refundedAt,
};

function createHandler(result: RefundOrderResult) {
  const execute = vi.fn().mockResolvedValue(result);
  const storeOrderRefundHandler = new StoreOrderRefundHandler({
    refundOrderUseCase: { execute } as unknown as RefundOrderUseCase,
  });

  return { execute, storeOrderRefundHandler };
}

describe("StoreOrderRefundHandler", () => {
  it("refunds the order holding the refunded payment and records the event", async () => {
    // arrange
    const { execute, storeOrderRefundHandler } = createHandler({
      status: "refunded",
    });

    // act
    const handling = await storeOrderRefundHandler.handle(
      "evt_refunded",
      refund,
    );

    // assert
    expect(handling).toBe("recorded");
    expect(execute).toHaveBeenCalledWith({
      eventId: "evt_refunded",
      paymentIntentId: "pi_order",
      refundedMinorUnits: 1500,
      refundedAt,
    });
  });

  it.each([
    ["duplicate", "duplicate"],
    ["unowned", "unowned"],
    ["not_paid", "ignored"],
  ] as const)("answers a %s refund as %s", async (status, expectedHandling) => {
    // arrange
    const { storeOrderRefundHandler } = createHandler({ status });

    // act
    const handling = await storeOrderRefundHandler.handle(
      "evt_refunded",
      refund,
    );

    // assert
    expect(handling).toBe(expectedHandling);
  });
});
