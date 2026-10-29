import {
  CallAlreadyPaid,
  type CheckoutPurchase,
  type RecordedCheckoutPurchase,
} from "./checkout-purchase";
import type { CoachingPurchases } from "./coaching-purchases";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { PaidClientAdmission } from "./paid-client-admission";
import type { PaymentEventLedger } from "./payment-event-ledger";

type RecordCheckoutPurchaseUseCaseOptions = {
  admission: Pick<PaidClientAdmission, "admit">;
  incidents: CoachingSubscriptionIncidents;
  paymentEventLedger: PaymentEventLedger;
  purchases: CoachingPurchases;
};

export class RecordCheckoutPurchaseUseCase {
  constructor(private readonly options: RecordCheckoutPurchaseUseCaseOptions) {}

  async execute(purchase: CheckoutPurchase): Promise<RecordedCheckoutPurchase> {
    const { client, eventId, paymentCustomerId, receivedAt, subscription } =
      purchase;
    const ledgerOutcome = await this.options.paymentEventLedger.record({
      eventId,
      receivedAt,
    });

    if (ledgerOutcome === "duplicate") {
      return {
        status: "duplicate",
        clientId: await this.options.purchases.findClientIdForCall(
          client.assessmentCallId,
        ),
        subscription,
        paymentCustomerId,
      };
    }

    const clientId = await this.admit(purchase);

    await this.options.purchases.insertSubscription({
      assessmentCallId: client.assessmentCallId,
      clientId,
      subscription,
      receivedAt,
    });
    await this.options.purchases.spendPaymentLink(
      subscription.checkoutSessionId,
    );

    return { status: "recorded", clientId, subscription, paymentCustomerId };
  }

  private async admit({
    client,
    eventId,
    receivedAt,
    subscription,
  }: CheckoutPurchase): Promise<string> {
    const admitted = await this.options.admission.admit({
      client,
      standing: subscription.standing(),
      at: receivedAt,
    });

    if (admitted.status === "call_already_has_client") {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "call_already_paid",
      });

      throw new CallAlreadyPaid();
    }

    return admitted.clientId;
  }
}
