import type { ClientJourney } from "./client-journey";
import type { OnboardingSubmissionRecorderPort } from "./onboarding-submission-recorder-port";

export interface ClientJourneysPort extends OnboardingSubmissionRecorderPort {
  findByAuthSubjectId(authSubjectId: string): Promise<ClientJourney | null>;
  recordWelcomeSeen(input: { clientId: string; at: Date }): Promise<void>;
}
