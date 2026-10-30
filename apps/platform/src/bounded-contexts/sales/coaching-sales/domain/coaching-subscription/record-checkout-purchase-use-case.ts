import {
  CallAlreadyPaid,
  type CheckoutPurchase,
  type RecordedCheckoutPurchase,
} from "./checkout-purchase";
import type { CoachingPurchasesPort } from "./coaching-purchases-port";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaidClientAdmissionPort } from "./paid-client-admission-port";
import type { PaymentEventLedgerPort } from "./payment-event-ledger-port";

type RecordCheckoutPurchaseUseCaseOptions = {
  admission: Pick<PaidClientAdmissionPort, "admit">;
  incidents: CoachingSubscriptionIncidentsPort;
  paymentEventLedger: PaymentEventLedgerPort;
  purchases: CoachingPurchasesPort;
};

export class RecordCheckoutPurchaseUseCase {
  constructor(private readonly options: RecordCheckoutPurchaseUseCaseOptions) {}

  async execute(purchase: CheckoutPurchase): Promise<RecordedCheckoutPurchase> {
    const { client, eventId, receivedAt, subscription } = purchase;
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

    return { status: "recorded", clientId, subscription };
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
