import type { CoachingEndHandlerPort } from "./coaching-end-handler-port";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";

type CoachingEndPropagationOptions = {
  coachingEnds: readonly CoachingEndHandlerPort[];
  coachingSubscriptionIncidentsPort: CoachingSubscriptionIncidentsPort;
};

type CoachingEndNotice = {
  subscriptionId: string;
  clientId: string;
  endsAt: Date;
};

export class CoachingEndPropagation {
  constructor(private readonly options: CoachingEndPropagationOptions) {}

  async propagate(subscription: CoachingSubscription): Promise<void> {
    const endsAt = subscription.coachingEndsAt();

    if (!endsAt) {
      return;
    }

    const notice = {
      subscriptionId: subscription.id,
      clientId: subscription.clientId,
      endsAt,
    };

    for (const coachingEndHandlerPort of this.options.coachingEnds) {
      await this.tell(coachingEndHandlerPort, notice);
    }
  }

  private async tell(
    coachingEndHandlerPort: CoachingEndHandlerPort,
    notice: CoachingEndNotice,
  ): Promise<void> {
    const { clientId, endsAt } = notice;

    try {
      await coachingEndHandlerPort.coachingEnds({ clientId, endsAt });
    } catch (error) {
      this.options.coachingSubscriptionIncidentsPort.coachingEndNotPropagated({
        ...notice,
        error,
      });
    }
  }
}
