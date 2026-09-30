type OnboardingSubmissionStamp = {
  clientId: string;
  at: Date;
};

export interface OnboardingSubmissionStamps {
  recordOnboardingSubmitted(stamp: OnboardingSubmissionStamp): Promise<void>;
}
