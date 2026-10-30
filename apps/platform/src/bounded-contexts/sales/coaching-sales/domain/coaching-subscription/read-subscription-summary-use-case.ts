import type { CoachingStatus } from "./coaching-standing";
import type { ClockPort } from "../clock-port";

import type { CoachingSubscriptionSnapshot } from "./coaching-subscription";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";

type SubscriptionSummary = {
  subscription: CoachingSubscriptionSnapshot;
  status: CoachingStatus;
  workStartsOn: Date | null;
  refundOutstandingCents: number | null;
};

type ReadSubscriptionSummaryUseCaseOptions = {
  clock: ClockPort;
  subscriptions: Pick<CoachingSubscriptionsPort, "findCurrentForClient">;
};

export class ReadSubscriptionSummaryUseCase {
  constructor(
    private readonly options: ReadSubscriptionSummaryUseCaseOptions,
  ) {}

  async execute(clientId: string): Promise<SubscriptionSummary | null> {
    const subscription =
      await this.options.subscriptions.findCurrentForClient(clientId);

    if (!subscription) {
      return null;
    }

    return {
      subscription: subscription.toSnapshot(),
      status: subscription.statusAt(this.options.clock.now()),
      workStartsOn: subscription.programWorkStart(),
      refundOutstandingCents: subscription.refund?.outstandingCents() ?? null,
    };
  }
}
