import { describe, expect, it } from "vitest";

import { RefundDue } from "./refund-due";

const CANCELLED_AT = new Date("2026-10-05T10:00:00.000Z");
const REFUNDED_AT = new Date("2026-10-08T09:00:00.000Z");

describe("RefundDue", () => {
  it("owes the full amount within 14 days of the cancellation", () => {
    // act
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: CANCELLED_AT,
    });

    // assert
    expect(refund.toSnapshot()).toEqual({
      reason: "full-refund",
      amountCents: 44700,
      dueBy: new Date("2026-10-19T10:00:00.000Z"),
      refundedCents: 0,
      refundedAt: null,
    });
  });

  it("still owes the rest after a partial refund", () => {
    // arrange
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: CANCELLED_AT,
    });

    // act
    const settled = refund.settle({ refundedCents: 10000, at: REFUNDED_AT });

    // assert
    expect(settled.outstandingCents()).toBe(34700);
    expect(settled.isSettled()).toBe(false);
    expect(settled.refundedAt).toBeNull();
  });

  it("is settled on the day the refunded total reaches what was owed", () => {
    // arrange
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: CANCELLED_AT,
    });

    // act
    const settled = refund.settle({ refundedCents: 44700, at: REFUNDED_AT });

    // assert
    expect(settled.outstandingCents()).toBe(0);
    expect(settled.isSettled()).toBe(true);
    expect(settled.refundedAt).toEqual(REFUNDED_AT);
  });

  it("keeps the larger refunded total when an older refund arrives late", () => {
    // arrange
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: CANCELLED_AT,
    }).settle({ refundedCents: 44700, at: REFUNDED_AT });

    // act
    const settled = refund.settle({
      refundedCents: 10000,
      at: new Date("2026-10-09T09:00:00.000Z"),
    });

    // assert
    expect(settled.toSnapshot()).toEqual(refund.toSnapshot());
  });

  it("keeps the day it was first settled", () => {
    // arrange
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: CANCELLED_AT,
    }).settle({ refundedCents: 44700, at: REFUNDED_AT });

    // act
    const settled = refund.settle({
      refundedCents: 44700,
      at: new Date("2026-10-09T09:00:00.000Z"),
    });

    // assert
    expect(settled.refundedAt).toEqual(REFUNDED_AT);
  });

  it("records a refund the coach issued with nothing owed as settled", () => {
    // act
    const refund = RefundDue.coachIssued({
      refundedCents: 20000,
      at: REFUNDED_AT,
    });

    // assert
    expect(refund.toSnapshot()).toEqual({
      reason: "coach-issued",
      amountCents: 0,
      dueBy: null,
      refundedCents: 20000,
      refundedAt: REFUNDED_AT,
    });
    expect(refund.isSettled()).toBe(true);
  });

  it("rebuilds a stored refund", () => {
    // arrange
    const snapshot = {
      reason: "full-refund" as const,
      amountCents: 44700,
      dueBy: new Date("2026-10-19T10:00:00.000Z"),
      refundedCents: 10000,
      refundedAt: null,
    };

    // act
    const refund = RefundDue.reconstitute(snapshot);

    // assert
    expect(refund.toSnapshot()).toEqual(snapshot);
  });

  it.each([
    ["nothing refunded yet", 0, true],
    ["part refunded", 10000, true],
    ["fully refunded", 44700, false],
  ])(
    "reads a stored refund with %s as outstanding: %s",
    (_label, refundedCents, outstanding) => {
      // arrange
      const snapshot = RefundDue.full({
        amountCents: 44700,
        cancelledAt: CANCELLED_AT,
      })
        .settle({ refundedCents, at: REFUNDED_AT })
        .toSnapshot();

      // act
      const result = RefundDue.isOutstanding(snapshot);

      // assert
      expect(result).toBe(outstanding);
    },
  );
});
