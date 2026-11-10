export type OrderRefundSnapshot = {
  refundedMinorUnits: number;
  refundedAt: Date;
};

export class OrderRefund {
  readonly refundedMinorUnits: number;
  readonly refundedAt: Date;

  private constructor(snapshot: OrderRefundSnapshot) {
    this.refundedMinorUnits = snapshot.refundedMinorUnits;
    this.refundedAt = snapshot.refundedAt;
  }

  static received(snapshot: OrderRefundSnapshot): OrderRefund {
    return new OrderRefund(snapshot);
  }

  static reconstitute(snapshot: OrderRefundSnapshot): OrderRefund {
    return new OrderRefund(snapshot);
  }

  mergedWith(reported: OrderRefund): OrderRefund {
    return new OrderRefund({
      refundedMinorUnits: Math.max(
        this.refundedMinorUnits,
        reported.refundedMinorUnits,
      ),
      refundedAt: this.refundedAt,
    });
  }

  toSnapshot(): OrderRefundSnapshot {
    return {
      refundedMinorUnits: this.refundedMinorUnits,
      refundedAt: this.refundedAt,
    };
  }
}
