export const REFUND_REASONS = ["full-refund", "coach-issued"] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

export type RefundDueSnapshot = {
  reason: RefundReason;
  amountCents: number;
  dueBy: Date | null;
  refundedCents: number;
  refundedAt: Date | null;
};

type OwedRefund = {
  amountCents: number;
  cancelledAt: Date;
};

type RefundSettlement = {
  refundedCents: number;
  at: Date;
};

const REFUND_DEADLINE_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class RefundDue {
  readonly reason: RefundReason;
  readonly amountCents: number;
  readonly dueBy: Date | null;
  readonly refundedCents: number;
  readonly refundedAt: Date | null;

  private constructor(snapshot: RefundDueSnapshot) {
    this.reason = snapshot.reason;
    this.amountCents = snapshot.amountCents;
    this.dueBy = snapshot.dueBy;
    this.refundedCents = snapshot.refundedCents;
    this.refundedAt = snapshot.refundedAt;
  }

  static full(owed: OwedRefund): RefundDue {
    return new RefundDue({
      reason: "full-refund",
      amountCents: owed.amountCents,
      dueBy: new Date(
        owed.cancelledAt.getTime() +
          REFUND_DEADLINE_DAYS * MILLISECONDS_PER_DAY,
      ),
      refundedCents: 0,
      refundedAt: null,
    });
  }

  static coachIssued(settlement: RefundSettlement): RefundDue {
    return new RefundDue({
      reason: "coach-issued",
      amountCents: 0,
      dueBy: null,
      refundedCents: settlement.refundedCents,
      refundedAt: settlement.at,
    });
  }

  static reconstitute(snapshot: RefundDueSnapshot): RefundDue {
    return new RefundDue(snapshot);
  }

  outstandingCents(): number {
    return Math.max(0, this.amountCents - this.refundedCents);
  }

  isSettled(): boolean {
    return this.outstandingCents() === 0;
  }

  settle(settlement: RefundSettlement): RefundDue {
    const refundedCents = Math.max(
      this.refundedCents,
      settlement.refundedCents,
    );
    const settled = refundedCents >= this.amountCents;

    return new RefundDue({
      ...this.toSnapshot(),
      refundedCents,
      refundedAt: settled ? (this.refundedAt ?? settlement.at) : null,
    });
  }

  toSnapshot(): RefundDueSnapshot {
    return {
      reason: this.reason,
      amountCents: this.amountCents,
      dueBy: this.dueBy,
      refundedCents: this.refundedCents,
      refundedAt: this.refundedAt,
    };
  }
}
