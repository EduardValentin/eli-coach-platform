import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { PaidClientAdmission } from "./paid-client-admission";
import type { PaymentSubscriptions } from "./payment-subscriptions";
import type { PurchasedSubscription } from "./purchased-subscription";
import type { RecordedCheckoutPurchase } from "./checkout-purchase";

type FinishedCheckoutPurchase = {
  status: RecordedCheckoutPurchase["status"];
  paymentCustomerId: string;
};

type FinishCheckoutPurchaseUseCaseOptions = {
  admission: Pick<PaidClientAdmission, "invite">;
  incidents: CoachingSubscriptionIncidents;
  paymentSubscriptions: PaymentSubscriptions;
};

export class FinishCheckoutPurchaseUseCase {
  constructor(private readonly options: FinishCheckoutPurchaseUseCaseOptions) {}

  async execute(
    purchase: RecordedCheckoutPurchase,
  ): Promise<FinishedCheckoutPurchase> {
    await this.options.admission.invite({ clientId: purchase.clientId });
    await this.holdRenewal(purchase.subscription);

    return {
      status: purchase.status,
      paymentCustomerId: purchase.paymentCustomerId,
    };
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
