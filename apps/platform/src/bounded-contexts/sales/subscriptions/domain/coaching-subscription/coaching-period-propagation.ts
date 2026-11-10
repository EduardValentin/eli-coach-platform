import type { CoachingPeriodHandlerPort } from "./coaching-period-handler-port";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";

type CoachingPeriodPropagationOptions = {
  coachingPeriods: readonly CoachingPeriodHandlerPort[];
  coachingSubscriptionIncidentsPort: Pick<
    CoachingSubscriptionIncidentsPort,
    "coachingPeriodNotPropagated"
  >;
};

type CoachingPeriodNotice = (
  coachingPeriodHandlerPort: CoachingPeriodHandlerPort,
) => Promise<void>;

export class CoachingPeriodPropagation {
  constructor(private readonly options: CoachingPeriodPropagationOptions) {}

  async propagatePaidThrough(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const notice = {
      clientId: subscription.clientId,
      paidThrough: subscription.paidThrough,
    };

    await this.tellEach(subscription, (coachingPeriodHandlerPort) =>
      coachingPeriodHandlerPort.paidThroughExtended(notice),
    );
  }

  async propagateProgramStart(
    subscription: CoachingSubscription,
  ): Promise<void> {
    const notice = {
      clientId: subscription.clientId,
      startsAt: subscription.programStartsAt,
    };

    await this.tellEach(subscription, (coachingPeriodHandlerPort) =>
      coachingPeriodHandlerPort.programStarted(notice),
    );
  }

  private async tellEach(
    subscription: CoachingSubscription,
    tell: CoachingPeriodNotice,
  ): Promise<void> {
    for (const coachingPeriodHandlerPort of this.options.coachingPeriods) {
      try {
        await tell(coachingPeriodHandlerPort);
      } catch (error) {
        this.options.coachingSubscriptionIncidentsPort.coachingPeriodNotPropagated(
          {
            subscriptionId: subscription.id,
            clientId: subscription.clientId,
            error,
          },
        );
      }
    }
  }
}
