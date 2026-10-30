import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaidClientAdmissionPort } from "./paid-client-admission-port";
import type { PaymentSubscriptionsPort } from "./payment-subscriptions-port";
import type { PurchasedSubscription } from "./purchased-subscription";
import type { RecordedCheckoutPurchase } from "./checkout-purchase";

type FinishCheckoutPurchaseUseCaseOptions = {
  admission: Pick<PaidClientAdmissionPort, "invite">;
  incidents: CoachingSubscriptionIncidentsPort;
  paymentSubscriptions: PaymentSubscriptionsPort;
};

export class FinishCheckoutPurchaseUseCase {
  constructor(private readonly options: FinishCheckoutPurchaseUseCaseOptions) {}

  async execute(purchase: RecordedCheckoutPurchase): Promise<void> {
    await this.options.admission.invite({ clientId: purchase.clientId });
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
      await this.options.paymentSubscriptions.holdRenewal({
        paymentSubscriptionId,
        until,
      });
    } catch (error) {
      this.options.incidents.renewalHoldFailed({
        paymentSubscriptionId,
        error,
      });

      throw error;
    }

    this.options.incidents.renewalHoldApplied({ paymentSubscriptionId });
  }
}
