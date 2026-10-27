import type { ClientLookup } from "./client-lookup";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptions } from "./coaching-subscriptions";

type SignedInSubscriptionsOptions = {
  clients: Pick<ClientLookup, "clientIdOf">;
  subscriptions: Pick<CoachingSubscriptions, "findCurrentForClient">;
};

export class SignedInSubscriptions {
  constructor(private readonly options: SignedInSubscriptionsOptions) {}

  async currentFor(
    authSubjectId: string,
  ): Promise<CoachingSubscription | null> {
    const clientId = await this.options.clients.clientIdOf(authSubjectId);

    if (!clientId) {
      return null;
    }

    return this.options.subscriptions.findCurrentForClient(clientId);
  }
}
