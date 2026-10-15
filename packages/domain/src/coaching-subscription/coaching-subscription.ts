import { CoachingStanding, type CoachingStatus } from "../client";
import type { CoachingBundleId, PriceTier } from "../coaching-bundle";

import { RefundDue, type RefundDueSnapshot } from "./refund-due";

export const COACHING_SUBSCRIPTION_PURPOSE = "coaching-subscription";

export const START_CHOICES = ["immediate", "waiting"] as const;

export type StartChoice = (typeof START_CHOICES)[number];

export type CheckoutCompletion = {
  checkoutSessionId: string;
  paymentCustomerId: string;
  paymentSubscriptionId: string;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string;
  customerEmail: string;
  paidAt: Date;
  assessmentCallId: string;
  bundleId: CoachingBundleId;
  tier: PriceTier;
  startChoice: StartChoice;
};

export const OFFERED_CANCELLATION_RULES = ["full-refund", "no-refund"] as const;

type OfferedCancellationRule = (typeof OFFERED_CANCELLATION_RULES)[number];

export type CancellationRule = OfferedCancellationRule | "none";

export const START_NOW_REFUSALS = ["ended", "outside-window"] as const;

export type StartNowRefusal = (typeof START_NOW_REFUSALS)[number];

export type ProviderInstruction =
  { kind: "end-now" } | { kind: "end-at"; at: Date };

export type SubscriptionCancellation =
  | {
      outcome: "cancelled";
      rule: Exclude<CancellationRule, "none">;
      subscription: CoachingSubscription;
      instruction: ProviderInstruction;
    }
  | { outcome: "nothing-to-cancel" };

type WithdrawalRefundRecording =
  | { outcome: "recorded"; subscription: CoachingSubscription }
  | { outcome: "refused" };

export type StartNowDecision =
  | { outcome: "started"; subscription: CoachingSubscription }
  | { outcome: "refused"; reason: StartNowRefusal };

export type CoachingSubscriptionSnapshot = {
  id: string;
  clientId: string;
  bundleId: CoachingBundleId;
  months: number;
  tier: PriceTier;
  amountCents: number;
  currency: string;
  paymentCustomerId: string;
  paymentSubscriptionId: string;
  checkoutSessionId: string;
  paidAt: Date;
  paidThrough: Date;
  startChoice: StartChoice;
  programStartsAt: Date;
  status: CoachingStatus;
  cancelledAt: Date | null;
  accessEndsAt: Date | null;
  paymentProblemSince: Date | null;
  refund: RefundDueSnapshot | null;
};

type CoachingSubscriptionProps = Omit<
  CoachingSubscriptionSnapshot,
  "refund"
> & {
  refund: RefundDue | null;
};

export const WITHDRAWAL_WINDOW_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function withdrawalDeadline(purchasedAt: Date): Date {
  return new Date(
    purchasedAt.getTime() + WITHDRAWAL_WINDOW_DAYS * MILLISECONDS_PER_DAY,
  );
}

export class CoachingSubscription {
  readonly id: string;
  readonly clientId: string;
  readonly bundleId: CoachingBundleId;
  readonly months: number;
  readonly tier: PriceTier;
  readonly amountCents: number;
  readonly currency: string;
  readonly paymentCustomerId: string;
  readonly paymentSubscriptionId: string;
  readonly checkoutSessionId: string;
  readonly paidAt: Date;
  readonly paidThrough: Date;
  readonly startChoice: StartChoice;
  readonly programStartsAt: Date;
  readonly status: CoachingStatus;
  readonly cancelledAt: Date | null;
  readonly accessEndsAt: Date | null;
  readonly paymentProblemSince: Date | null;
  readonly refund: RefundDue | null;

  private constructor(props: CoachingSubscriptionProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.bundleId = props.bundleId;
    this.months = props.months;
    this.tier = props.tier;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.paymentCustomerId = props.paymentCustomerId;
    this.paymentSubscriptionId = props.paymentSubscriptionId;
    this.checkoutSessionId = props.checkoutSessionId;
    this.paidAt = props.paidAt;
    this.paidThrough = props.paidThrough;
    this.startChoice = props.startChoice;
    this.programStartsAt = props.programStartsAt;
    this.status = props.status;
    this.cancelledAt = props.cancelledAt;
    this.accessEndsAt = props.accessEndsAt;
    this.paymentProblemSince = props.paymentProblemSince;
    this.refund = props.refund;
  }

  static reconstitute(
    snapshot: CoachingSubscriptionSnapshot,
  ): CoachingSubscription {
    return new CoachingSubscription({
      ...snapshot,
      refund: snapshot.refund ? RefundDue.reconstitute(snapshot.refund) : null,
    });
  }

  standing(): CoachingStanding {
    return CoachingStanding.of({
      status: this.status,
      accessEndsAt: this.accessEndsAt,
      refundDue: this.hasRefundOutstanding(),
      bundleMonths: this.months,
      programStartsAt: this.programStartsAt,
      paidThrough: this.paidThrough,
    });
  }

  statusAt(now: Date): CoachingStatus {
    return this.standing().at(now);
  }

  hasRefundOutstanding(): boolean {
    return this.refund !== null && !this.refund.isSettled();
  }

  hasPaymentProblem(): boolean {
    return this.paymentProblemSince !== null;
  }

  coachingEndsAt(): Date | null {
    return this.standing().coachingEndsAt();
  }

  hasPortalAccessAt(now: Date): boolean {
    return this.standing().hasPortalAccessAt(now);
  }

  cancellationRule(now: Date): CancellationRule {
    const status = this.statusAt(now);

    if (status === "cancelled" || status === "ended") {
      return "none";
    }

    const withinWithdrawalPeriod =
      now.getTime() < withdrawalDeadline(this.paidAt).getTime();

    return this.startChoice === "waiting" && withinWithdrawalPeriod
      ? "full-refund"
      : "no-refund";
  }

  cancel(now: Date): SubscriptionCancellation {
    const rule = this.cancellationRule(now);

    if (rule === "none") {
      return { outcome: "nothing-to-cancel" };
    }

    if (rule === "no-refund") {
      const accessEndsAt = this.paidThrough;

      return {
        outcome: "cancelled",
        rule,
        subscription: this.with({
          status: "cancelled",
          cancelledAt: now,
          accessEndsAt,
        }),
        instruction: { kind: "end-at", at: accessEndsAt },
      };
    }

    return {
      outcome: "cancelled",
      rule,
      subscription: this.with({
        status: "ended",
        cancelledAt: now,
        accessEndsAt: now,
        refund: this.withdrawalRefund(now),
      }),
      instruction: { kind: "end-now" },
    };
  }

  refundOnCancellationAt(now: Date): number {
    return this.cancellationRule(now) === "full-refund" ? this.amountCents : 0;
  }

  programWorkStart(): Date | null {
    return this.startChoice === "waiting" ? this.programStartsAt : null;
  }

  startNowUntil(now: Date): Date | null {
    return this.upcomingWorkStart(now);
  }

  upcomingWorkStart(now: Date): Date | null {
    const workStart = this.programWorkStart();

    if (this.statusAt(now) !== "not-started" || workStart === null) {
      return null;
    }

    return now.getTime() < workStart.getTime() ? workStart : null;
  }

  startNow(now: Date): StartNowDecision {
    if (this.statusAt(now) === "ended") {
      return { outcome: "refused", reason: "ended" };
    }

    if (this.startNowUntil(now) === null) {
      return { outcome: "refused", reason: "outside-window" };
    }

    return {
      outcome: "started",
      subscription: this.with({
        startChoice: "immediate",
        programStartsAt: now,
      }),
    };
  }

  scheduleEnd(schedule: { endsAt: Date; at: Date }): CoachingSubscription {
    if (this.status === "ended") {
      return this;
    }

    return this.with({
      status: "cancelled",
      cancelledAt: this.cancelledAt ?? schedule.at,
      accessEndsAt: schedule.endsAt,
    });
  }

  recordWithdrawalRefund(cancelledAt: Date): WithdrawalRefundRecording {
    if (this.status !== "ended" || this.refund !== null) {
      return { outcome: "refused" };
    }

    return {
      outcome: "recorded",
      subscription: this.with({
        cancelledAt,
        refund: this.withdrawalRefund(cancelledAt),
      }),
    };
  }

  liftScheduledEnd(): CoachingSubscription {
    if (this.status !== "cancelled") {
      return this;
    }

    return this.with({
      status: "not-started",
      cancelledAt: null,
      accessEndsAt: null,
    });
  }

  end(at: Date): CoachingSubscription {
    if (this.status === "ended") {
      return this;
    }

    return this.with({
      status: "ended",
      cancelledAt: this.cancelledAt ?? at,
      accessEndsAt: at,
    });
  }

  flagPaymentProblem(at: Date): CoachingSubscription {
    return this.with({ paymentProblemSince: this.paymentProblemSince ?? at });
  }

  renewalPaid(paidThrough: Date): CoachingSubscription {
    return this.with({ paidThrough, paymentProblemSince: null });
  }

  clearPaymentProblem(): CoachingSubscription {
    return this.with({ paymentProblemSince: null });
  }

  settleRefund(settlement: {
    refundedCents: number;
    at: Date;
  }): CoachingSubscription {
    return this.with({
      refund: this.refund
        ? this.refund.settle(settlement)
        : RefundDue.coachIssued(settlement),
    });
  }

  toSnapshot(): CoachingSubscriptionSnapshot {
    return {
      ...this.props(),
      refund: this.refund?.toSnapshot() ?? null,
    };
  }

  private withdrawalRefund(cancelledAt: Date): RefundDue {
    return RefundDue.full({ amountCents: this.amountCents, cancelledAt });
  }

  private with(
    changes: Partial<CoachingSubscriptionProps>,
  ): CoachingSubscription {
    return new CoachingSubscription({ ...this.props(), ...changes });
  }

  private props(): CoachingSubscriptionProps {
    return {
      id: this.id,
      clientId: this.clientId,
      bundleId: this.bundleId,
      months: this.months,
      tier: this.tier,
      amountCents: this.amountCents,
      currency: this.currency,
      paymentCustomerId: this.paymentCustomerId,
      paymentSubscriptionId: this.paymentSubscriptionId,
      checkoutSessionId: this.checkoutSessionId,
      paidAt: this.paidAt,
      paidThrough: this.paidThrough,
      startChoice: this.startChoice,
      programStartsAt: this.programStartsAt,
      status: this.status,
      cancelledAt: this.cancelledAt,
      accessEndsAt: this.accessEndsAt,
      paymentProblemSince: this.paymentProblemSince,
      refund: this.refund,
    };
  }
}

export function addCalendarMonths(instant: Date, months: number): Date {
  const shifted = new Date(instant.getTime());
  const dayOfMonth = shifted.getUTCDate();
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  shifted.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));

  return shifted;
}
