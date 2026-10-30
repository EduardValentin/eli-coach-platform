import type { CoachingStatus } from "./coaching-standing";
import type { ClockPort } from "../clock-port";

import {
  withdrawalDeadline,
  type CancellationRule,
  type CoachingSubscriptionSnapshot,
} from "./coaching-subscription";
import type { PaymentCardSnapshot } from "./payment-card";
import type { PaymentCardsPort } from "./payment-cards-port";
import type { SignedInSubscriptions } from "./signed-in-subscriptions";

type ClientSubscriptionReading = {
  subscription: CoachingSubscriptionSnapshot;
  status: CoachingStatus;
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
  paymentCardsPort: PaymentCardsPort;
  clockPort: ClockPort;
  signedInSubscriptions: Pick<SignedInSubscriptions, "currentFor">;
};

export class ReadClientSubscriptionUseCase {
  constructor(private readonly options: ReadClientSubscriptionUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<ClientSubscriptionReading | null> {
    const subscription =
      await this.options.signedInSubscriptions.currentFor(authSubjectId);

    if (!subscription) {
      return null;
    }

    const now = this.options.clockPort.now();
    const card = await this.options.paymentCardsPort.findByPaymentCustomerId(
      subscription.paymentCustomerId,
    );

    return {
      subscription: subscription.toSnapshot(),
      status: subscription.statusAt(now),
      cancellationRule: subscription.cancellationRule(now),
      withdrawalDeadline: withdrawalDeadline(subscription.paidAt),
      paidThrough: subscription.paidThrough,
      refundOnCancellationCents: subscription.refundOnCancellationAt(now),
      startNowUntil: subscription.startNowUntil(now),
      paymentProblem: subscription.hasPaymentProblem(),
      refundDue: subscription.hasRefundOutstanding(),
      card: card?.toSnapshot() ?? null,
    };
  }
}
