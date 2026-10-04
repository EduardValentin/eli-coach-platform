import type { Clock } from "../shared";

import {
  withdrawalDeadline,
  type CancellationRule,
  type CoachingSubscriptionSnapshot,
  type CoachingSubscriptionStatus,
} from "./coaching-subscription";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import type { PaymentCardSnapshot } from "./payment-card";
import type { PaymentCards } from "./payment-cards";

type ClientSubscriptionReading = {
  subscription: CoachingSubscriptionSnapshot;
  status: CoachingSubscriptionStatus;
  cancellationRule: CancellationRule;
  withdrawalDeadline: Date;
  paidThrough: Date;
  refundOnCancellationCents: number;
  startNowUntil: Date | null;
  paymentProblem: boolean;
  refundDue: boolean;
  card: PaymentCardSnapshot | null;
};

type ReadClientSubscriptionUseCaseOptions = {
  cards: PaymentCards;
  clock: Clock;
  subscriptions: CoachingSubscriptions;
};

export class ReadClientSubscriptionUseCase {
  constructor(private readonly options: ReadClientSubscriptionUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<ClientSubscriptionReading | null> {
    const subscription =
      await this.options.subscriptions.findCurrentForAuthSubject(authSubjectId);

    if (!subscription) {
      return null;
    }

    const now = this.options.clock.now();
    const card = await this.options.cards.findByPaymentCustomerId(
      subscription.paymentCustomerId,
    );

    return {
      subscription: subscription.toSnapshot(),
      status: subscription.statusAt(now),
      cancellationRule: subscription.cancellationRule(now),
      withdrawalDeadline: withdrawalDeadline(subscription.paidAt),
      paidThrough: subscription.paidThrough(),
      refundOnCancellationCents: subscription.refundOnCancellationAt(now),
      startNowUntil: subscription.startNowUntil(now),
      paymentProblem: subscription.hasPaymentProblem(),
      refundDue: subscription.hasRefundOutstanding(),
      card: card?.toSnapshot() ?? null,
    };
  }
}
