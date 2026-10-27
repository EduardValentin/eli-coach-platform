import {
  CoachingStanding,
  type CoachingStatus,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  getCoachingBundle,
  type CoachingBundleId,
  type PriceTier,
} from "../coaching-bundle";

import {
  addCalendarMonths,
  withdrawalDeadline,
  type CheckoutCompletion,
  type StartChoice,
} from "./coaching-subscription";

export type PurchasedSubscriptionSnapshot = {
  id: string;
  bundleId: CoachingBundleId;
  months: number;
  tier: PriceTier;
  amountCents: number;
  currency: string;
  paymentCustomerId: string;
  paymentSubscriptionId: string;
  paymentIntentId: string | null;
  checkoutSessionId: string;
  paidAt: Date;
  paidThrough: Date;
  startChoice: StartChoice;
  programStartsAt: Date;
  status: CoachingStatus;
};

export class PurchasedSubscription {
  readonly id: string;
  readonly bundleId: CoachingBundleId;
  readonly months: number;
  readonly tier: PriceTier;
  readonly amountCents: number;
  readonly currency: string;
  readonly paymentCustomerId: string;
  readonly paymentSubscriptionId: string;
  readonly paymentIntentId: string | null;
  readonly checkoutSessionId: string;
  readonly paidAt: Date;
  readonly paidThrough: Date;
  readonly startChoice: StartChoice;
  readonly programStartsAt: Date;
  readonly status: CoachingStatus;

  private constructor(snapshot: PurchasedSubscriptionSnapshot) {
    this.id = snapshot.id;
    this.bundleId = snapshot.bundleId;
    this.months = snapshot.months;
    this.tier = snapshot.tier;
    this.amountCents = snapshot.amountCents;
    this.currency = snapshot.currency;
    this.paymentCustomerId = snapshot.paymentCustomerId;
    this.paymentSubscriptionId = snapshot.paymentSubscriptionId;
    this.paymentIntentId = snapshot.paymentIntentId;
    this.checkoutSessionId = snapshot.checkoutSessionId;
    this.paidAt = snapshot.paidAt;
    this.paidThrough = snapshot.paidThrough;
    this.startChoice = snapshot.startChoice;
    this.programStartsAt = snapshot.programStartsAt;
    this.status = snapshot.status;
  }

  static fromCompletedCheckout({
    id,
    completion,
  }: {
    id: string;
    completion: CheckoutCompletion;
  }): PurchasedSubscription {
    const months = getCoachingBundle(completion.bundleId).months;

    return new PurchasedSubscription({
      id,
      bundleId: completion.bundleId,
      months,
      tier: completion.tier,
      amountCents: completion.amountCents,
      currency: completion.currency,
      paymentCustomerId: completion.paymentCustomerId,
      paymentSubscriptionId: completion.paymentSubscriptionId,
      paymentIntentId: completion.paymentIntentId,
      checkoutSessionId: completion.checkoutSessionId,
      paidAt: completion.paidAt,
      paidThrough: addCalendarMonths(completion.paidAt, months),
      startChoice: completion.startChoice,
      programStartsAt:
        completion.startChoice === "waiting"
          ? withdrawalDeadline(completion.paidAt)
          : completion.paidAt,
      status: "not-started",
    });
  }

  standing(): CoachingStanding {
    return CoachingStanding.of({
      status: this.status,
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: this.months,
      programStartsAt: this.programStartsAt,
      paidThrough: this.paidThrough,
    });
  }

  renewalHoldUntil(): Date | null {
    return this.startChoice === "waiting" ? this.programStartsAt : null;
  }

  toSnapshot(): PurchasedSubscriptionSnapshot {
    return {
      id: this.id,
      bundleId: this.bundleId,
      months: this.months,
      tier: this.tier,
      amountCents: this.amountCents,
      currency: this.currency,
      paymentCustomerId: this.paymentCustomerId,
      paymentSubscriptionId: this.paymentSubscriptionId,
      paymentIntentId: this.paymentIntentId,
      checkoutSessionId: this.checkoutSessionId,
      paidAt: this.paidAt,
      paidThrough: this.paidThrough,
      startChoice: this.startChoice,
      programStartsAt: this.programStartsAt,
      status: this.status,
    };
  }
}
