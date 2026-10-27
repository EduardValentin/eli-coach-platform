import type { CoachingStatus } from "./coaching-standing";
import type { Clock } from "../clock";

import type { CoachingSubscriptionSnapshot } from "./coaching-subscription";
import type { CoachingSubscriptions } from "./coaching-subscriptions";

type SubscriptionSummary = {
  subscription: CoachingSubscriptionSnapshot;
  status: CoachingStatus;
  workStartsOn: Date | null;
  refundOutstandingCents: number | null;
};

type ReadSubscriptionSummaryUseCaseOptions = {
  clock: Clock;
  subscriptions: Pick<CoachingSubscriptions, "findCurrentForClient">;
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
