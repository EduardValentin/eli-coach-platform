import { Client } from "../client";
import type { AssessmentCallReader } from "../payment-link";
import type { Clock } from "../shared";

import type { CoachingPurchases } from "./coaching-purchases";
import type { CheckoutCompletion } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { PaidClientAdmission } from "./paid-client-admission";
import type { PaymentCheckout } from "./payment-checkout";
import type { PaymentSubscriptions } from "./payment-subscriptions";
import { PurchasedSubscription } from "./purchased-subscription";

type RecordCheckoutCompletedCommand = {
  eventId: string;
  checkoutSessionId: string;
};

type RecordCheckoutCompletedResult =
  | { status: "recorded"; paymentCustomerId: string }
  | { status: "duplicate"; paymentCustomerId: string }
  | { status: "already_paid" }
  | { status: "call_not_found" }
  | { status: "unreadable_checkout" };

type RecordCheckoutCompletedUseCaseOptions = {
  admission: PaidClientAdmission;
  calls: AssessmentCallReader;
  clock: Clock;
  incidents: CoachingSubscriptionIncidents;
  paymentCheckout: PaymentCheckout;
  paymentSubscriptions: PaymentSubscriptions;
  purchases: CoachingPurchases;
};

const STATUS_BY_PURCHASE_OUTCOME = {
  recorded: "recorded",
  duplicate_event: "duplicate",
} as const;

export class RecordCheckoutCompletedUseCase {
  constructor(
    private readonly options: RecordCheckoutCompletedUseCaseOptions,
  ) {}

  async execute(
    command: RecordCheckoutCompletedCommand,
  ): Promise<RecordCheckoutCompletedResult> {
    const completion = await this.options.paymentCheckout.findCompletedSession(
      command.checkoutSessionId,
    );

    if (!completion) {
      this.options.incidents.paymentEventRejected({
        eventId: command.eventId,
        reason: "unreadable_checkout",
      });

      return { status: "unreadable_checkout" };
    }

    return this.record({ completion, eventId: command.eventId });
  }

  private async record({
    completion,
    eventId,
  }: {
    completion: CheckoutCompletion;
    eventId: string;
  }): Promise<RecordCheckoutCompletedResult> {
    const call = await this.options.calls.findById(completion.assessmentCallId);

    if (!call) {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "call_not_found",
      });

      return { status: "call_not_found" };
    }

    const purchase = await this.options.purchases.recordCompletion({
      eventId,
      client: Client.fromAssessmentCall(call, this.options.clock.now()),
      subscription: PurchasedSubscription.fromCompletedCheckout(completion),
    });

    if (purchase.outcome === "call_already_paid") {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "call_already_paid",
      });

      return { status: "already_paid" };
    }

    await this.options.admission.admit({ clientId: purchase.clientId });
    await this.holdRenewal(completion.paymentSubscriptionId);

    return {
      status: STATUS_BY_PURCHASE_OUTCOME[purchase.outcome],
      paymentCustomerId: completion.paymentCustomerId,
    };
  }

  private async holdRenewal(paymentSubscriptionId: string): Promise<void> {
    try {
      await this.options.paymentSubscriptions.holdRenewal(
        paymentSubscriptionId,
      );
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
