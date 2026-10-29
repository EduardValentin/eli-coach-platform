import type { EndedCalls, SalesCall } from "../payment-link";
import type { Clock } from "../clock";

import type { CheckoutPurchase } from "./checkout-purchase";
import type { CoachingSubscriptionIds } from "./coaching-subscription-ids";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { PaidClientIntake } from "./paid-client-admission";
import type { PaymentCheckout } from "./payment-checkout";
import { PurchasedSubscription } from "./purchased-subscription";

type ReadCheckoutPurchaseCommand = {
  eventId: string;
  checkoutSessionId: string;
};

type ReadCheckoutPurchaseResult =
  | { status: "found"; purchase: CheckoutPurchase }
  | { status: "call_not_found" }
  | { status: "unreadable_checkout" };

type ReadCheckoutPurchaseUseCaseOptions = {
  calls: EndedCalls;
  clock: Clock;
  incidents: CoachingSubscriptionIncidents;
  paymentCheckout: PaymentCheckout;
  subscriptionIds: CoachingSubscriptionIds;
};

export class ReadCheckoutPurchaseUseCase {
  constructor(private readonly options: ReadCheckoutPurchaseUseCaseOptions) {}

  async execute(
    command: ReadCheckoutPurchaseCommand,
  ): Promise<ReadCheckoutPurchaseResult> {
    const { eventId } = command;
    const completion = await this.options.paymentCheckout.findCompletedSession(
      command.checkoutSessionId,
    );

    if (!completion) {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "unreadable_checkout",
      });

      return { status: "unreadable_checkout" };
    }

    const call = await this.options.calls.findById(completion.assessmentCallId);

    if (!call) {
      this.options.incidents.paymentEventRejected({
        eventId,
        reason: "call_not_found",
      });

      return { status: "call_not_found" };
    }

    return {
      status: "found",
      purchase: {
        eventId,
        receivedAt: this.options.clock.now(),
        client: this.intakeOf(call),
        subscription: PurchasedSubscription.fromCompletedCheckout({
          id: this.options.subscriptionIds.generate(),
          completion,
        }),
      },
    };
  }

  private intakeOf(call: SalesCall): PaidClientIntake {
    return {
      assessmentCallId: call.id,
      firstName: call.firstName,
      lastName: call.lastName,
      email: call.visitorEmail,
      dateOfBirth: call.dateOfBirth,
      gender: call.gender,
      primaryGoal: call.primaryGoal,
      country: call.country,
      phone: call.phone,
      bookingTimeZone: call.visitorTimeZone,
    };
  }
}
