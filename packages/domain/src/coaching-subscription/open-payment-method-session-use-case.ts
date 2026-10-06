import type { Clock } from "../shared";

import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import type { PaymentSubscriptions } from "./payment-subscriptions";

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
  clock: Clock;
  incidents: CoachingSubscriptionIncidents;
  paymentSubscriptions: PaymentSubscriptions;
  subscriptions: CoachingSubscriptions;
};

export class OpenPaymentMethodSessionUseCase {
  constructor(
    private readonly options: OpenPaymentMethodSessionUseCaseOptions,
  ) {}

  async execute(
    command: OpenPaymentMethodSessionCommand,
  ): Promise<OpenPaymentMethodSessionResult> {
    const subscription =
      await this.options.subscriptions.findCurrentForAuthSubject(
        command.authSubjectId,
      );

    if (!subscription) {
      return { status: "not_found" };
    }

    if (!subscription.hasPortalAccessAt(this.options.clock.now())) {
      return { status: "ended" };
    }

    try {
      const session =
        await this.options.paymentSubscriptions.openPaymentMethodSession({
          paymentCustomerId: subscription.paymentCustomerId,
          returnUrl: command.returnUrl,
        });

      this.options.incidents.paymentMethodSessionOpened({
        subscriptionId: subscription.id,
      });

      return { status: "opened", url: session.url };
    } catch {
      return { status: "provider_unavailable" };
    }
  }
}
