import type { CoachingEndHandler } from "./coaching-end-handler";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";

type CoachingEndPropagationOptions = {
  coachingEnd: CoachingEndHandler;
  incidents: CoachingSubscriptionIncidents;
};

export class CoachingEndPropagation {
  constructor(private readonly options: CoachingEndPropagationOptions) {}

  async propagate(subscription: CoachingSubscription): Promise<void> {
    const endsAt = subscription.coachingEndsAt();

    if (!endsAt) {
      return;
    }

    const { clientId } = subscription;

    try {
      await this.options.coachingEnd.coachingEnds({ clientId, endsAt });
    } catch (error) {
      this.options.incidents.coachingEndNotPropagated({
        subscriptionId: subscription.id,
        clientId,
        endsAt,
        error,
      });
    }
  }
}
