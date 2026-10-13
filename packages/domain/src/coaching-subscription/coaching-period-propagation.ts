import type { CoachingPeriodHandler } from "./coaching-period-handler";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";

type CoachingPeriodPropagationOptions = {
  coachingPeriods: readonly CoachingPeriodHandler[];
  incidents: Pick<CoachingSubscriptionIncidents, "coachingPeriodNotPropagated">;
};

type CoachingPeriodNotice = (handler: CoachingPeriodHandler) => Promise<void>;

export class CoachingPeriodPropagation {
  constructor(private readonly options: CoachingPeriodPropagationOptions) {}

  async propagatePaidThrough(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const notice = {
      clientId: subscription.clientId,
      paidThrough: subscription.paidThrough,
    };

    await this.tellEach(subscription, (handler) =>
      handler.paidThroughExtended(notice),
    );
  }

  async propagateProgramStart(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const notice = {
      clientId: subscription.clientId,
      startsAt: subscription.programStartsAt,
    };

    await this.tellEach(subscription, (handler) =>
      handler.programStarted(notice),
    );
  }

  private async tellEach(
    subscription: CoachingSubscription,
    tell: CoachingPeriodNotice,
  ): Promise<void> {
    for (const handler of this.options.coachingPeriods) {
      try {
        await tell(handler);
      } catch (error) {
        this.options.incidents.coachingPeriodNotPropagated({
          subscriptionId: subscription.id,
          clientId: subscription.clientId,
          error,
        });
      }
    }
  }
}
