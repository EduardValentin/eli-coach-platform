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
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientId">;
  clientReachPort: ClientReachPort;
  readClientJourneyUseCase: ReadClientJourneyUseCase;
};

export class ClientLookupFacadeAdapter implements ClientLookupFacade {
  constructor(private readonly options: ClientLookupFacadeOptions) {}

  async identityOf(clientId: string) {
    const identity =
      await this.options.clientIdentitiesPort.findByClientId(clientId);

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
    return this.reachDtoOf(
      await this.options.clientReachPort.findById(clientId),
    );
  }

  async reachOfSubject(authSubjectId: string) {
    return this.reachDtoOf(
      await this.options.clientReachPort.findByAuthSubjectId(authSubjectId),
    );
  }

  async journeyStepOf(authSubjectId: string) {
    const journey =
      await this.options.readClientJourneyUseCase.execute(authSubjectId);

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
