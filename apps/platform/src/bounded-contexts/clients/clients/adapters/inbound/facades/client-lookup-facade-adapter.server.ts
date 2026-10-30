import type {
  ClientIdentitiesPort,
  ClientReachPort,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { ReadClientJourneyUseCase } from "~/bounded-contexts/clients/clients/domain/client-journey";
import type {
  ClientLookupFacade,
  ClientReachDto,
} from "~/bounded-contexts/clients/public/client-lookup-facade";

type ClientLookupFacadeOptions = {
  identities: Pick<ClientIdentitiesPort, "findByClientId">;
  reach: ClientReachPort;
  readClientJourney: ReadClientJourneyUseCase;
};

export class ClientLookupFacadeAdapter implements ClientLookupFacade {
  constructor(private readonly options: ClientLookupFacadeOptions) {}

  async identityOf(clientId: string) {
    const identity = await this.options.identities.findByClientId(clientId);

    return identity
      ? {
          clientId: identity.clientId,
          firstName: identity.firstName,
          lastName: identity.lastName,
          email: identity.email,
        }
      : null;
  }

  async reachOf(clientId: string) {
    return this.reachDtoOf(await this.options.reach.findById(clientId));
  }

  async reachOfSubject(authSubjectId: string) {
    return this.reachDtoOf(
      await this.options.reach.findByAuthSubjectId(authSubjectId),
    );
  }

  async journeyStepOf(authSubjectId: string) {
    const journey = await this.options.readClientJourney.execute(authSubjectId);

    return journey
      ? {
          clientId: journey.clientId,
          step: journey.step(),
          onboardingSubmittedAt:
            journey.onboardingSubmittedAt?.toISOString() ?? null,
        }
      : null;
  }

  private reachDtoOf(
    reading: ClientReachReading | null,
  ): ClientReachDto | null {
    return reading
      ? { clientId: reading.clientId, timeZone: reading.timeZone }
      : null;
  }
}
