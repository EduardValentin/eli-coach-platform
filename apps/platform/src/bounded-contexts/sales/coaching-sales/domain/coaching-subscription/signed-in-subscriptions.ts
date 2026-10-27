import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";

import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptions } from "./coaching-subscriptions";

type SignedInSubscriptionsOptions = {
  clientReach: Pick<ClientReach, "findByAuthSubjectId">;
  subscriptions: Pick<CoachingSubscriptions, "findCurrentForClient">;
};

export class SignedInSubscriptions {
  constructor(private readonly options: SignedInSubscriptionsOptions) {}

  async currentFor(
    authSubjectId: string,
  ): Promise<CoachingSubscription | null> {
    const client =
      await this.options.clientReach.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    return this.options.subscriptions.findCurrentForClient(client.clientId);
  }
}
