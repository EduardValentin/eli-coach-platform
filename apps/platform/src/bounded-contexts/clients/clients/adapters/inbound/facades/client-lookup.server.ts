import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { ReadClientJourneyUseCase } from "~/bounded-contexts/clients/clients/domain/client-journey";
import type {
  ClientLookupFacade,
  ClientReachDto,
} from "~/bounded-contexts/clients/public/client-lookup";

type ClientLookupFacadeOptions = {
  identities: Pick<ClientIdentities, "findByClientId">;
  reach: ClientReach;
  readClientJourney: ReadClientJourneyUseCase;
};

export function createClientLookupFacade(
  options: ClientLookupFacadeOptions,
): ClientLookupFacade {
  return {
    identityOf: async (clientId) => {
      const identity = await options.identities.findByClientId(clientId);

      return identity
        ? {
            clientId: identity.clientId,
            firstName: identity.firstName,
            lastName: identity.lastName,
            email: identity.email,
          }
        : null;
    },
    reachOf: async (clientId) =>
      reachDtoOf(await options.reach.findById(clientId)),
    reachOfSubject: async (authSubjectId) =>
      reachDtoOf(await options.reach.findByAuthSubjectId(authSubjectId)),
    journeyStepOf: async (authSubjectId) => {
      const journey = await options.readClientJourney.execute(authSubjectId);

      return journey
        ? {
            clientId: journey.clientId,
            step: journey.step(),
            onboardingSubmittedAt:
              journey.onboardingSubmittedAt?.toISOString() ?? null,
          }
        : null;
    },
  };
}

function reachDtoOf(reading: ClientReachReading | null): ClientReachDto | null {
  return reading
    ? { clientId: reading.clientId, timeZone: reading.timeZone }
    : null;
}
