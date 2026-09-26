import {
  getCoachingBundle,
  type CoachingBundleId,
  type PriceTier,
} from "../coaching-bundle";

export const START_CHOICES = ["immediate", "waiting"] as const;

export type StartChoice = (typeof START_CHOICES)[number];

export type CheckoutCompletion = {
  checkoutSessionId: string;
  paymentCustomerId: string;
  paymentSubscriptionId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  paidAt: Date;
  assessmentCallId: string;
  bundleId: CoachingBundleId;
  tier: PriceTier;
  startChoice: StartChoice;
};

type CoachingSubscriptionStatus = "not-started";

type CoachingSubscriptionProps = {
  bundleId: CoachingBundleId;
  months: number;
  tier: PriceTier;
  amountCents: number;
  currency: string;
  paymentCustomerId: string;
  paymentSubscriptionId: string;
  checkoutSessionId: string;
  paidAt: Date;
  startChoice: StartChoice;
  status: CoachingSubscriptionStatus;
};

const WITHDRAWAL_WINDOW_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function withdrawalDeadline(purchasedAt: Date): Date {
  return new Date(
    purchasedAt.getTime() + WITHDRAWAL_WINDOW_DAYS * MILLISECONDS_PER_DAY,
  );
}

export class CoachingSubscription {
  readonly bundleId: CoachingBundleId;
  readonly months: number;
  readonly tier: PriceTier;
  readonly amountCents: number;
  readonly currency: string;
  readonly paymentCustomerId: string;
  readonly paymentSubscriptionId: string;
  readonly checkoutSessionId: string;
  readonly paidAt: Date;
  readonly startChoice: StartChoice;
  readonly status: CoachingSubscriptionStatus;

  private constructor(props: CoachingSubscriptionProps) {
    this.bundleId = props.bundleId;
    this.months = props.months;
    this.tier = props.tier;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.paymentCustomerId = props.paymentCustomerId;
    this.paymentSubscriptionId = props.paymentSubscriptionId;
    this.checkoutSessionId = props.checkoutSessionId;
    this.paidAt = props.paidAt;
    this.startChoice = props.startChoice;
    this.status = props.status;
  }

  static fromCompletedCheckout(
    completion: CheckoutCompletion,
  ): CoachingSubscription {
    return new CoachingSubscription({
      bundleId: completion.bundleId,
      months: getCoachingBundle(completion.bundleId).months,
      tier: completion.tier,
      amountCents: completion.amountCents,
      currency: completion.currency,
      paymentCustomerId: completion.paymentCustomerId,
      paymentSubscriptionId: completion.paymentSubscriptionId,
      checkoutSessionId: completion.checkoutSessionId,
      paidAt: completion.paidAt,
      startChoice: completion.startChoice,
      status: "not-started",
    });
  }
}
