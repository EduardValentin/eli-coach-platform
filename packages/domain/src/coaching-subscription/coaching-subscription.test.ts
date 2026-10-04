import { describe, expect, it } from "vitest";

import {
  CoachingSubscription,
  START_CHOICES,
  withdrawalDeadline,
  type CoachingSubscriptionSnapshot,
  type StartChoice,
} from "./coaching-subscription";
import { RefundDue } from "./refund-due";

const PAID_AT = new Date("2026-10-02T10:00:00.000Z");
const WITHDRAWAL_DEADLINE = new Date("2026-10-16T10:00:00.000Z");
const ACCESS_END = new Date("2027-01-02T10:00:00.000Z");
const ONE_MINUTE = 60 * 1000;

const DAY_13 = new Date(WITHDRAWAL_DEADLINE.getTime() - ONE_MINUTE);
const DAY_14 = WITHDRAWAL_DEADLINE;

function snapshotOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscriptionSnapshot {
  return {
    id: "subscription-1",
    clientId: "client-1",
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: PAID_AT,
    startChoice: "waiting",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  };
}

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscription {
  return CoachingSubscription.reconstitute(snapshotOf(overrides));
}

function onPath(startChoice: StartChoice): CoachingSubscription {
  return subscriptionOf({ startChoice });
}

describe("CoachingSubscription.cancellationRule", () => {
  it.each([
    ["waiting", DAY_13, "full-refund"],
    ["waiting", DAY_14, "no-refund"],
    ["immediate", PAID_AT, "no-refund"],
    ["immediate", DAY_13, "no-refund"],
    ["immediate", DAY_14, "no-refund"],
  ] as const)(
    "on the %s path at %s offers %s",
    (startChoice, now, expected) => {
      // act
      const rule = onPath(startChoice).cancellationRule(now);

      // assert
      expect(rule).toBe(expected);
    },
  );

  it.each([
    ["cancelled", { status: "cancelled", accessEndsAt: ACCESS_END }],
    ["ended", { status: "ended", accessEndsAt: DAY_13 }],
  ] as const)("offers nothing once %s", (_label, overrides) => {
    // act
    const rule = subscriptionOf({
      ...overrides,
      cancelledAt: PAID_AT,
    }).cancellationRule(DAY_13);

    // assert
    expect(rule).toBe("none");
  });
});

describe("CoachingSubscription.cancel", () => {
  it("ends a waiting-path subscription now with the amount paid due back", () => {
    // arrange
    const subscription = onPath("waiting");

    // act
    const cancellation = subscription.cancel(DAY_13);

    // assert
    expect(cancellation).toMatchObject({
      outcome: "cancelled",
      rule: "full-refund",
      instruction: { kind: "end-now" },
    });
    expect(
      cancellation.outcome === "cancelled" &&
        cancellation.subscription.toSnapshot(),
    ).toEqual(
      snapshotOf({
        status: "ended",
        cancelledAt: DAY_13,
        accessEndsAt: DAY_13,
        refund: RefundDue.full({
          amountCents: 44700,
          cancelledAt: DAY_13,
        }).toSnapshot(),
      }),
    );
  });

  it("cancels the immediate path without a refund within the 14 days, keeping access until purchase plus the bundle months", () => {
    // act
    const cancellation = onPath("immediate").cancel(DAY_13);

    // assert
    expect(cancellation).toMatchObject({
      outcome: "cancelled",
      rule: "no-refund",
      instruction: { kind: "end-at", at: ACCESS_END },
    });
    expect(
      cancellation.outcome === "cancelled" &&
        cancellation.subscription.toSnapshot(),
    ).toEqual(
      snapshotOf({
        startChoice: "immediate",
        status: "cancelled",
        cancelledAt: DAY_13,
        accessEndsAt: ACCESS_END,
      }),
    );
  });

  it("cancels without a refund once the withdrawal right is gone, keeping access until purchase plus the bundle months", () => {
    // arrange
    const subscription = onPath("waiting");

    // act
    const cancellation = subscription.cancel(DAY_14);

    // assert
    expect(cancellation).toMatchObject({
      outcome: "cancelled",
      rule: "no-refund",
      instruction: { kind: "end-at", at: ACCESS_END },
    });
    expect(
      cancellation.outcome === "cancelled" &&
        cancellation.subscription.toSnapshot(),
    ).toEqual(
      snapshotOf({
        status: "cancelled",
        cancelledAt: DAY_14,
        accessEndsAt: ACCESS_END,
      }),
    );
  });

  it("keeps access until the last day of a shorter month", () => {
    // arrange
    const subscription = subscriptionOf({
      bundleId: "1-month",
      months: 1,
      paidAt: new Date("2027-01-31T10:00:00.000Z"),
    });

    // act
    const cancellation = subscription.cancel(
      new Date("2027-02-20T10:00:00.000Z"),
    );

    // assert
    expect(cancellation).toMatchObject({
      instruction: { kind: "end-at", at: new Date("2027-02-28T10:00:00.000Z") },
    });
  });

  it.each([
    ["already cancelled", { status: "cancelled", accessEndsAt: ACCESS_END }],
    ["ended", { status: "ended", accessEndsAt: DAY_13 }],
  ] as const)("has nothing to cancel when %s", (_label, overrides) => {
    // act
    const cancellation = subscriptionOf({
      ...overrides,
      cancelledAt: PAID_AT,
    }).cancel(DAY_14);

    // assert
    expect(cancellation).toEqual({ outcome: "nothing-to-cancel" });
  });
});

describe("CoachingSubscription.refundOnCancellationAt", () => {
  it.each([
    ["waiting", DAY_13, 44700],
    ["immediate", DAY_13, 0],
    ["waiting", DAY_14, 0],
  ] as const)(
    "owes back on the %s path at %s what a cancellation would refund",
    (startChoice, now, expected) => {
      // act
      const refundCents = onPath(startChoice).refundOnCancellationAt(now);

      // assert
      expect(refundCents).toBe(expected);
    },
  );
});

describe("CoachingSubscription.statusAt", () => {
  it.each([
    ["not started", {}, DAY_14, "not-started"],
    [
      "cancelled before its access end",
      { status: "cancelled", accessEndsAt: ACCESS_END },
      new Date(ACCESS_END.getTime() - ONE_MINUTE),
      "cancelled",
    ],
    [
      "cancelled at its access end",
      { status: "cancelled", accessEndsAt: ACCESS_END },
      ACCESS_END,
      "ended",
    ],
    ["ended", { status: "ended", accessEndsAt: DAY_13 }, DAY_13, "ended"],
  ] as const)("reads a subscription %s as %s", (_l, overrides, now, status) => {
    // act
    const result = subscriptionOf(overrides).statusAt(now);

    // assert
    expect(result).toBe(status);
  });

  it("derives the same status from a snapshot", () => {
    // arrange
    const snapshot = snapshotOf({
      status: "cancelled",
      accessEndsAt: ACCESS_END,
    });

    // act
    const status = CoachingSubscription.statusOf(snapshot, ACCESS_END);

    // assert
    expect(status).toBe("ended");
  });

  it.each([
    [{ status: "cancelled", accessEndsAt: ACCESS_END }, DAY_14, true],
    [{ status: "cancelled", accessEndsAt: ACCESS_END }, ACCESS_END, false],
    [{ status: "ended", accessEndsAt: DAY_13 }, DAY_13, false],
    [{}, DAY_14, true],
  ] as const)(
    "grants portal access to %o at %s: %s",
    (overrides, now, expected) => {
      // act
      const access = subscriptionOf(overrides).hasPortalAccessAt(now);

      // assert
      expect(access).toBe(expected);
    },
  );
});

describe("CoachingSubscription.isCancelledOrEnded", () => {
  it.each([
    [null, false],
    ["not-started", false],
    ["active", false],
    ["cancelled", true],
    ["ended", true],
  ] as const)(
    "reads a %s subscription as cancelled or ended: %s",
    (status, expected) => {
      // act
      const cancelledOrEnded = CoachingSubscription.isCancelledOrEnded(status);

      // assert
      expect(cancelledOrEnded).toBe(expected);
    },
  );
});

describe("CoachingSubscription.hasRefundOutstanding", () => {
  it.each([
    ["no refund", null, false],
    [
      "a refund still owed",
      {
        ...RefundDue.full({
          amountCents: 44700,
          cancelledAt: DAY_13,
        }).toSnapshot(),
      },
      true,
    ],
    [
      "a part-settled refund",
      {
        ...RefundDue.full({
          amountCents: 44700,
          cancelledAt: DAY_13,
        }).toSnapshot(),
        refundedCents: 10000,
      },
      true,
    ],
    [
      "a settled refund",
      {
        ...RefundDue.full({
          amountCents: 44700,
          cancelledAt: DAY_13,
        }).toSnapshot(),
        refundedCents: 44700,
        refundedAt: DAY_14,
      },
      false,
    ],
  ] as const)("reads %s as outstanding: %s", (_case, refund, expected) => {
    // arrange
    const subscription = subscriptionOf({ refund });

    // act
    const outstanding = subscription.hasRefundOutstanding();

    // assert
    expect(outstanding).toBe(expected);
  });
});

describe("CoachingSubscription.hasPaymentProblem", () => {
  it.each([
    [null, false],
    [DAY_13, true],
  ] as const)(
    "reads a problem flagged at %s as %s",
    (paymentProblemSince, expected) => {
      // arrange
      const subscription = subscriptionOf({ paymentProblemSince });

      // act
      const problem = subscription.hasPaymentProblem();

      // assert
      expect(problem).toBe(expected);
    },
  );
});

describe("CoachingSubscription start now", () => {
  it("offers to start now on the waiting path on day 13, until the withdrawal deadline", () => {
    // act
    const until = onPath("waiting").startNowUntil(DAY_13);

    // assert
    expect(until).toEqual(WITHDRAWAL_DEADLINE);
  });

  it.each([
    ["the waiting path at the deadline", onPath("waiting")],
    ["the immediate path", subscriptionOf({ startChoice: "immediate" })],
    [
      "a cancelled subscription",
      subscriptionOf({
        status: "cancelled",
        cancelledAt: PAID_AT,
        accessEndsAt: ACCESS_END,
      }),
    ],
    [
      "an ended subscription",
      subscriptionOf({ status: "ended", accessEndsAt: PAID_AT }),
    ],
  ])("offers no start now on %s", (_label, subscription) => {
    // act
    const until = subscription.startNowUntil(DAY_14);

    // assert
    expect(until).toBeNull();
  });

  it("turns the waiting path into the immediate one", () => {
    // act
    const decision = onPath("waiting").startNow(DAY_13);

    // assert
    expect(
      decision.outcome === "started" && decision.subscription.toSnapshot(),
    ).toEqual(snapshotOf({ startChoice: "immediate" }));
  });

  it("leaves only the no-refund cancellation after starting now", () => {
    // arrange
    const decision = onPath("waiting").startNow(DAY_13);

    // act
    const rule =
      decision.outcome === "started" &&
      decision.subscription.cancellationRule(DAY_13);

    // assert
    expect(rule).toBe("no-refund");
  });

  it.each([
    ["at the deadline", onPath("waiting"), DAY_14, "outside-window"],
    ["on the immediate path", onPath("immediate"), DAY_13, "outside-window"],
    [
      "once cancelled",
      subscriptionOf({
        status: "cancelled",
        cancelledAt: PAID_AT,
        accessEndsAt: ACCESS_END,
      }),
      DAY_13,
      "outside-window",
    ],
    [
      "once ended",
      subscriptionOf({ status: "ended", accessEndsAt: PAID_AT }),
      DAY_13,
      "ended",
    ],
  ] as const)("refuses to start now %s", (_l, subscription, now, reason) => {
    // act
    const decision = subscription.startNow(now);

    // assert
    expect(decision).toEqual({ outcome: "refused", reason });
  });

  it("starts the work once the window closes on the waiting path", () => {
    // act
    const workStart = onPath("waiting").programWorkStart();

    // assert
    expect(workStart).toEqual(WITHDRAWAL_DEADLINE);
  });

  it("names no later work start on the immediate path", () => {
    // act
    const workStart = onPath("immediate").programWorkStart();

    // assert
    expect(workStart).toBeNull();
  });

  it("names the upcoming work start on the waiting path before the window closes", () => {
    // act
    const upcoming = onPath("waiting").upcomingWorkStart(DAY_13);

    // assert
    expect(upcoming).toEqual(WITHDRAWAL_DEADLINE);
  });

  it.each([
    ["once the window closes", onPath("waiting"), DAY_14],
    ["on the immediate path", onPath("immediate"), DAY_13],
    [
      "once cancelled",
      subscriptionOf({
        status: "cancelled",
        cancelledAt: PAID_AT,
        accessEndsAt: ACCESS_END,
      }),
      DAY_13,
    ],
  ] as const)("names no upcoming work start %s", (_l, subscription, now) => {
    // act
    const upcoming = subscription.upcomingWorkStart(now);

    // assert
    expect(upcoming).toBeNull();
  });
});

describe("CoachingSubscription.recordWithdrawalRefund", () => {
  const PROVIDER_ENDED_AT = new Date(DAY_13.getTime() + ONE_MINUTE);
  const decidedRefund = RefundDue.full({
    amountCents: 44700,
    cancelledAt: DAY_13,
  });

  it("records the full refund her withdrawal decided on a subscription the provider has just ended", () => {
    // arrange
    const providerEnded = onPath("waiting").end(PROVIDER_ENDED_AT);

    // act
    const recording = providerEnded.recordWithdrawalRefund(DAY_13);

    // assert
    expect(
      recording.outcome === "recorded" && recording.subscription.toSnapshot(),
    ).toEqual(
      snapshotOf({
        status: "ended",
        cancelledAt: DAY_13,
        accessEndsAt: PROVIDER_ENDED_AT,
        refund: decidedRefund.toSnapshot(),
      }),
    );
  });

  it("refuses a subscription that has not ended", () => {
    // act
    const recording = onPath("waiting").recordWithdrawalRefund(DAY_13);

    // assert
    expect(recording).toEqual({ outcome: "refused" });
  });

  it("refuses a subscription that already records a refund", () => {
    // arrange
    const cancellation = onPath("waiting").cancel(DAY_13);
    const alreadyRefunded =
      cancellation.outcome === "cancelled"
        ? cancellation.subscription
        : onPath("waiting");

    // act
    const recording = alreadyRefunded.recordWithdrawalRefund(DAY_13);

    // assert
    expect(recording).toEqual({ outcome: "refused" });
  });
});

describe("CoachingSubscription mirror rules", () => {
  const SCHEDULED_AT = new Date("2026-10-20T10:00:00.000Z");

  it("records a cancellation scheduled in the provider with its access end", () => {
    // act
    const scheduled = onPath("waiting").scheduleEnd({
      endsAt: ACCESS_END,
      at: SCHEDULED_AT,
    });

    // assert
    expect(scheduled.toSnapshot()).toEqual(
      snapshotOf({
        status: "cancelled",
        cancelledAt: SCHEDULED_AT,
        accessEndsAt: ACCESS_END,
      }),
    );
  });

  it("keeps the cancellation instant the platform recorded when the provider echoes its schedule", () => {
    // arrange
    const cancelled = subscriptionOf({
      status: "cancelled",
      cancelledAt: DAY_14,
      accessEndsAt: ACCESS_END,
    });

    // act
    const scheduled = cancelled.scheduleEnd({
      endsAt: ACCESS_END,
      at: SCHEDULED_AT,
    });

    // assert
    expect(scheduled.toSnapshot()).toEqual(cancelled.toSnapshot());
  });

  it("puts a lifted cancellation back to not started", () => {
    // arrange
    const cancelled = subscriptionOf({
      status: "cancelled",
      cancelledAt: DAY_14,
      accessEndsAt: ACCESS_END,
    });

    // act
    const lifted = cancelled.liftScheduledEnd();

    // assert
    expect(lifted.toSnapshot()).toEqual(snapshotOf());
  });

  it("ends a subscription at the provider's end instant without a refund", () => {
    // act
    const ended = onPath("waiting").end(SCHEDULED_AT);

    // assert
    expect(ended.toSnapshot()).toEqual(
      snapshotOf({
        status: "ended",
        cancelledAt: SCHEDULED_AT,
        accessEndsAt: SCHEDULED_AT,
      }),
    );
  });

  it.each([
    [
      "schedule",
      (s: CoachingSubscription) =>
        s.scheduleEnd({ endsAt: ACCESS_END, at: SCHEDULED_AT }),
    ],
    ["lift", (s: CoachingSubscription) => s.liftScheduledEnd()],
    ["end", (s: CoachingSubscription) => s.end(SCHEDULED_AT)],
  ])("leaves an ended subscription alone on %s", (_label, apply) => {
    // arrange
    const ended = onPath("waiting").cancel(DAY_13);
    const subscription =
      ended.outcome === "cancelled" ? ended.subscription : onPath("waiting");

    // act
    const result = apply(subscription);

    // assert
    expect(result.toSnapshot()).toEqual(subscription.toSnapshot());
  });

  it("flags a payment problem from its first sighting", () => {
    // arrange
    const flagged = onPath("waiting").flagPaymentProblem(SCHEDULED_AT);

    // act
    const flaggedAgain = flagged.flagPaymentProblem(ACCESS_END);

    // assert
    expect(flaggedAgain.paymentProblemSince).toEqual(SCHEDULED_AT);
  });

  it("clears a payment problem", () => {
    // arrange
    const flagged = onPath("waiting").flagPaymentProblem(SCHEDULED_AT);

    // act
    const cleared = flagged.clearPaymentProblem();

    // assert
    expect(cleared.paymentProblemSince).toBeNull();
  });

  it("settles the refund it owes", () => {
    // arrange
    const cancellation = onPath("waiting").cancel(DAY_13);
    const ended =
      cancellation.outcome === "cancelled"
        ? cancellation.subscription
        : onPath("waiting");

    // act
    const settled = ended.settleRefund({
      refundedCents: 44700,
      at: SCHEDULED_AT,
    });

    // assert
    expect(settled.refund?.toSnapshot()).toMatchObject({
      refundedCents: 44700,
      refundedAt: SCHEDULED_AT,
    });
  });

  it("records a refund the coach issued when none was owed", () => {
    // act
    const settled = onPath("waiting").settleRefund({
      refundedCents: 20000,
      at: SCHEDULED_AT,
    });

    // assert
    expect(settled.refund?.toSnapshot()).toEqual(
      RefundDue.coachIssued({
        refundedCents: 20000,
        at: SCHEDULED_AT,
      }).toSnapshot(),
    );
  });
});

describe("withdrawalDeadline", () => {
  it("falls 14 days after the purchase", () => {
    // act
    const deadline = withdrawalDeadline(PAID_AT);

    // assert
    expect(deadline).toEqual(WITHDRAWAL_DEADLINE);
  });
});

describe("START_CHOICES", () => {
  it("offers an immediate start or waiting out the withdrawal window", () => {
    // assert
    expect(START_CHOICES).toEqual(["immediate", "waiting"]);
  });
});
