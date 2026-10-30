import type {
  ClientLookupPort,
  SubscribedClient,
  SubscribedClientJourney,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";

export class ClientsClientLookupAdapter implements ClientLookupPort {
  constructor(private readonly clientLookupFacade: ClientLookupFacade) {}

  identityOf(clientId: string): Promise<SubscribedClient | null> {
    return this.clientLookupFacade.identityOf(clientId);
  }

  async clientIdOf(authSubjectId: string): Promise<string | null> {
    const reach = await this.clientLookupFacade.reachOfSubject(authSubjectId);

    return reach?.clientId ?? null;
  }

  async journeyOf(
    authSubjectId: string,
  ): Promise<SubscribedClientJourney | null> {
    const journey = await this.clientLookupFacade.journeyStepOf(authSubjectId);

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
