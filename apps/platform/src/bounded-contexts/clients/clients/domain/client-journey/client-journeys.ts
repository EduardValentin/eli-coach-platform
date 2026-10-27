import type { ClientJourney } from "./client-journey";

export interface ClientJourneys {
  findByAuthSubjectId(authSubjectId: string): Promise<ClientJourney | null>;
  recordWelcomeSeen(input: { clientId: string; at: Date }): Promise<void>;
  recordOnboardingSubmitted(input: {
    clientId: string;
    at: Date;
  }): Promise<void>;
}
