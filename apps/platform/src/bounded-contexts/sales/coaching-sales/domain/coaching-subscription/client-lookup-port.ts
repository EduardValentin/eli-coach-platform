export type SubscribedClient = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type SubscribedClientJourney = {
  clientId: string;
  step: string;
  onboardingSubmittedAt: Date | null;
};

export interface ClientLookupPort {
  identityOf(clientId: string): Promise<SubscribedClient | null>;
  clientIdOf(authSubjectId: string): Promise<string | null>;
  journeyOf(authSubjectId: string): Promise<SubscribedClientJourney | null>;
}
