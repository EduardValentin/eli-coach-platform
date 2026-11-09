import type { EndedCallsPort, SalesCall } from "../payment-link";
import type { ClockPort } from "../clock-port";

import type { CheckoutPurchase } from "./checkout-purchase";
import type { CoachingSubscriptionIdsPort } from "./coaching-subscription-ids-port";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaidClientIntake } from "./paid-client-admission-port";
import type { PaymentCheckoutPort } from "./payment-checkout-port";
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
  endedCallsPort: EndedCallsPort;
  clockPort: ClockPort;
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  paymentCheckoutPort: PaymentCheckoutPort;
  coachingSubscriptionIdsPort: CoachingSubscriptionIdsPort;
};

export class ReadCheckoutPurchaseUseCase {
  constructor(private readonly options: ReadCheckoutPurchaseUseCaseOptions) {}

  async execute(
    command: ReadCheckoutPurchaseCommand,
  ): Promise<ReadCheckoutPurchaseResult> {
    const { eventId } = command;
    const completion =
      await this.options.paymentCheckoutPort.findCompletedSession(
        command.checkoutSessionId,
      );

    if (!completion) {
      this.options.coachingSubscriptionIncidentsPort.paymentEventRejected({
        eventId,
        reason: "unreadable_checkout",
      });

      return { status: "unreadable_checkout" };
    }

    const call = await this.options.endedCallsPort.findById(
      completion.assessmentCallId,
    );

    if (!call) {
      this.options.coachingSubscriptionIncidentsPort.paymentEventRejected({
        eventId,
        reason: "call_not_found",
      });

      return { status: "call_not_found" };
    }

    return {
      status: "found",
      purchase: {
        eventId,
        receivedAt: this.options.clockPort.now(),
        client: this.intakeOf(call),
        subscription: PurchasedSubscription.fromCompletedCheckout({
          id: this.options.coachingSubscriptionIdsPort.generate(),
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
