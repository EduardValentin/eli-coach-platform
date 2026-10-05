import {
  getCoachingBundle,
  type CoachingBundleId,
  type PriceTier,
} from "../coaching-bundle";

import type {
  CheckoutCompletion,
  CoachingSubscriptionStatus,
  StartChoice,
} from "./coaching-subscription";

export type PurchasedSubscriptionSnapshot = {
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
  startChoice: StartChoice;
  status: CoachingSubscriptionStatus;
};

export class PurchasedSubscription {
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
  readonly startChoice: StartChoice;
  readonly status: CoachingSubscriptionStatus;

  private constructor(snapshot: PurchasedSubscriptionSnapshot) {
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
    this.startChoice = snapshot.startChoice;
    this.status = snapshot.status;
  }

  static fromCompletedCheckout(
    completion: CheckoutCompletion,
  ): PurchasedSubscription {
    return new PurchasedSubscription({
      bundleId: completion.bundleId,
      months: getCoachingBundle(completion.bundleId).months,
      tier: completion.tier,
      amountCents: completion.amountCents,
      currency: completion.currency,
      paymentCustomerId: completion.paymentCustomerId,
      paymentSubscriptionId: completion.paymentSubscriptionId,
      paymentIntentId: completion.paymentIntentId,
      checkoutSessionId: completion.checkoutSessionId,
      paidAt: completion.paidAt,
      startChoice: completion.startChoice,
      status: "not-started",
    });
  }

  toSnapshot(): PurchasedSubscriptionSnapshot {
    return {
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
      startChoice: this.startChoice,
      status: this.status,
    };
  }
}
