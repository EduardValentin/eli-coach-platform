import type { ClientProfile } from "../client-profile";
import type { MeasurementEntry } from "../measurement";

import type { OnboardingDraft } from "./onboarding-draft";
import type { OnboardingSubmission } from "./onboarding-submission";

type SaveOnboardingDraft = {
  clientId: string;
  draft: OnboardingDraft;
};

type RecordOnboardingSubmission = {
  clientId: string;
  submission: OnboardingSubmission;
  measurementEntry: MeasurementEntry;
  profile: ClientProfile;
};

type RecordedOnboardingSubmission =
  { status: "recorded"; entryId: string } | { status: "already-submitted" };

export interface ClientOnboardingChanges {
  saveDraft(input: SaveOnboardingDraft): Promise<"saved" | "already-submitted">;
  recordSubmission(
    input: RecordOnboardingSubmission,
  ): Promise<RecordedOnboardingSubmission>;
}
