export interface OnboardingSubmissionRecorderPort {
  recordOnboardingSubmitted(input: {
    clientId: string;
    at: Date;
  }): Promise<void>;
}
