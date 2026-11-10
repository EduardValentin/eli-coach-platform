import { describe, expect, it } from "vitest";

import { OrderRefund } from "./order-refund";

const firstRefundedAt = new Date("2026-11-10T09:00:00.000Z");
const laterRefundedAt = new Date("2026-11-11T09:00:00.000Z");

describe("OrderRefund", () => {
  it("keeps the refunded amount and the moment Stripe reported it", () => {
    // arrange
    const snapshot = { refundedMinorUnits: 1500, refundedAt: firstRefundedAt };

    // act
    const refund = OrderRefund.received(snapshot);

    // assert
    expect(refund.toSnapshot()).toEqual(snapshot);
  });

  it("takes a later refund's cumulative amount and keeps the first refund's moment", () => {
    // arrange
    const first = OrderRefund.received({
      refundedMinorUnits: 1500,
      refundedAt: firstRefundedAt,
    });
    const later = OrderRefund.received({
      refundedMinorUnits: 6800,
      refundedAt: laterRefundedAt,
    });

    // act
    const updated = first.mergedWith(later);

    // assert
    expect(updated.toSnapshot()).toEqual({
      refundedMinorUnits: 6800,
      refundedAt: firstRefundedAt,
    });
  });

  it("keeps the larger cumulative amount when an earlier refund's event arrives late", () => {
    // arrange
    const recorded = OrderRefund.reconstitute({
      refundedMinorUnits: 2900,
      refundedAt: firstRefundedAt,
    });
    const late = OrderRefund.received({
      refundedMinorUnits: 2400,
      refundedAt: laterRefundedAt,
    });

    // act
    const updated = recorded.mergedWith(late);

    // assert
    expect(updated.toSnapshot()).toEqual({
      refundedMinorUnits: 2900,
      refundedAt: firstRefundedAt,
    });
  });
});
