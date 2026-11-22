import type { ClientJourneyStepName } from "./client-journey-step";

type ClientIdentityDto = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: "female" | "male" | "prefer_not_to_say";
};

export type ClientReachDto = {
  clientId: string;
  timeZone: string;
};

type ClientJourneyStepDto = {
  clientId: string;
  step: ClientJourneyStepName;
  onboardingSubmittedAt: string | null;
};

export interface ClientLookupFacade {
  identityOf(clientId: string): Promise<ClientIdentityDto | null>;
  reachOf(clientId: string): Promise<ClientReachDto | null>;
  reachOfSubject(authSubjectId: string): Promise<ClientReachDto | null>;
  journeyStepOf(authSubjectId: string): Promise<ClientJourneyStepDto | null>;
}
