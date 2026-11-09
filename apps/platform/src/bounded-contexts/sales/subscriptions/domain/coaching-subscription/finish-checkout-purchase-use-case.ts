import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaidClientAdmissionPort } from "./paid-client-admission-port";
import type { PaymentSubscriptionsPort } from "./payment-subscriptions-port";
import type { PurchasedSubscription } from "./purchased-subscription";
import type { RecordedCheckoutPurchase } from "./checkout-purchase";

type FinishCheckoutPurchaseUseCaseOptions = {
  paidClientAdmissionPort: Pick<PaidClientAdmissionPort, "invite">;
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  paymentSubscriptionsPort: PaymentSubscriptionsPort;
};

export class FinishCheckoutPurchaseUseCase {
  constructor(private readonly options: FinishCheckoutPurchaseUseCaseOptions) {}

  async execute(purchase: RecordedCheckoutPurchase): Promise<void> {
    await this.options.paidClientAdmissionPort.invite({
      clientId: purchase.clientId,
    });
    await this.holdRenewal(purchase.subscription);
  }

  private async holdRenewal(
    subscription: PurchasedSubscription,
  ): Promise<void> {
    const { paymentSubscriptionId } = subscription;
    const until = subscription.renewalHoldUntil();

    if (until === null) {
      return;
    }

    try {
      await this.options.paymentSubscriptionsPort.holdRenewal({
        paymentSubscriptionId,
        until,
      });
    } catch (error) {
      this.options.coachingSubscriptionIncidentsPort.renewalHoldFailed({
        paymentSubscriptionId,
        error,
      });

      throw error;
    }

    this.options.coachingSubscriptionIncidentsPort.renewalHoldApplied({
      paymentSubscriptionId,
    });
  }
}
