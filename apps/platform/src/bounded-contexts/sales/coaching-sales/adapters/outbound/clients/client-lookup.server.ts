import type {
  ClientLookup,
  SubscribedClient,
  SubscribedClientJourney,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup";

export class ClientsClientLookup implements ClientLookup {
  constructor(private readonly lookup: ClientLookupFacade) {}

  identityOf(clientId: string): Promise<SubscribedClient | null> {
    return this.lookup.identityOf(clientId);
  }

  async clientIdOf(authSubjectId: string): Promise<string | null> {
    const reach = await this.lookup.reachOfSubject(authSubjectId);

    return reach?.clientId ?? null;
  }

  async journeyOf(
    authSubjectId: string,
  ): Promise<SubscribedClientJourney | null> {
    const journey = await this.lookup.journeyStepOf(authSubjectId);

    if (!journey) {
      return null;
    }

    return {
      clientId: journey.clientId,
      step: journey.step,
      onboardingSubmittedAt: journey.onboardingSubmittedAt
        ? new Date(journey.onboardingSubmittedAt)
        : null,
    };
  }
}
