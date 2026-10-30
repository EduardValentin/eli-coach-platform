import type { CoachingEndHandlerPort } from "./coaching-end-handler-port";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";

type CoachingEndPropagationOptions = {
  coachingEnds: readonly CoachingEndHandlerPort[];
  incidents: CoachingSubscriptionIncidentsPort;
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

    for (const handler of this.options.coachingEnds) {
      await this.tell(handler, notice);
    }
  }

  private async tell(
    handler: CoachingEndHandlerPort,
    notice: CoachingEndNotice,
  ): Promise<void> {
    const { clientId, endsAt } = notice;

    try {
      await handler.coachingEnds({ clientId, endsAt });
    } catch (error) {
      this.options.incidents.coachingEndNotPropagated({ ...notice, error });
    }
  }
}
