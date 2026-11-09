import type { ClockPort } from "../clock-port";

import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type { PaymentSubscriptionsPort } from "./payment-subscriptions-port";
import type { SignedInSubscriptions } from "./signed-in-subscriptions";

type OpenPaymentMethodSessionCommand = {
  authSubjectId: string;
  returnUrl: string;
};

type OpenPaymentMethodSessionResult =
  | { status: "opened"; url: string }
  | { status: "ended" }
  | { status: "not_found" }
  | { status: "provider_unavailable" };

type OpenPaymentMethodSessionUseCaseOptions = {
  clockPort: ClockPort;
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
  paymentSubscriptionsPort: PaymentSubscriptionsPort;
  signedInSubscriptions: Pick<SignedInSubscriptions, "currentFor">;
};

export class OpenPaymentMethodSessionUseCase {
  constructor(
    private readonly options: OpenPaymentMethodSessionUseCaseOptions,
  ) {}

  async execute(
    command: OpenPaymentMethodSessionCommand,
  ): Promise<OpenPaymentMethodSessionResult> {
    const subscription = await this.options.signedInSubscriptions.currentFor(
      command.authSubjectId,
    );

    if (!subscription) {
      return { status: "not_found" };
    }

    if (!subscription.hasPortalAccessAt(this.options.clockPort.now())) {
      return { status: "ended" };
    }

    try {
      const session =
        await this.options.paymentSubscriptionsPort.openPaymentMethodSession({
          paymentCustomerId: subscription.paymentCustomerId,
          returnUrl: command.returnUrl,
        });

      this.options.coachingSubscriptionIncidentsPort.paymentMethodSessionOpened(
        {
          subscriptionId: subscription.id,
        },
      );

      return { status: "opened", url: session.url };
    } catch {
      return { status: "provider_unavailable" };
    }
  }
}
