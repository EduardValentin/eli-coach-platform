import type { ClientLookupPort } from "./client-lookup-port";
import type { CoachingSubscription } from "./coaching-subscription";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";

type SignedInSubscriptionsOptions = {
  clients: Pick<ClientLookupPort, "clientIdOf">;
  subscriptions: Pick<CoachingSubscriptionsPort, "findCurrentForClient">;
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
