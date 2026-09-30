export type OnboardingConsents = {
  specialCategoryAt: Date | null;
  disclaimerAt: Date | null;
  progressPhotosAt: Date | null;
};

export function noConsents(): OnboardingConsents {
  return {
    specialCategoryAt: null,
    disclaimerAt: null,
    progressPhotosAt: null,
  };
}
