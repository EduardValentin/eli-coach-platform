type OnboardingSubmissionStamp = {
  clientId: string;
  at: Date;
};

export interface OnboardingSubmissionStampsPort {
  recordOnboardingSubmitted(stamp: OnboardingSubmissionStamp): Promise<void>;
}
