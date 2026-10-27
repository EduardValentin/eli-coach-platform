import type { ClientJourney } from "./client-journey";

export interface OnboardingSubmissionRecorder {
  recordOnboardingSubmitted(input: {
    clientId: string;
    at: Date;
  }): Promise<void>;
}

export interface ClientJourneys extends OnboardingSubmissionRecorder {
  findByAuthSubjectId(authSubjectId: string): Promise<ClientJourney | null>;
  recordWelcomeSeen(input: { clientId: string; at: Date }): Promise<void>;
}
