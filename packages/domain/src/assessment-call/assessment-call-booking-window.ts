import {
  WAITLIST_MODE_FEATURE_FLAG,
  type FeatureFlagEvaluation,
  type FeatureFlagReader,
} from "../feature-flag";

import type { AssessmentCallIncidents } from "./assessment-call-incidents";

type AssessmentCallBookingWindowOptions = {
  featureFlags: FeatureFlagReader;
  incidents: AssessmentCallIncidents;
};

export class AssessmentCallBookingWindow {
  constructor(private readonly options: AssessmentCallBookingWindowOptions) {}

  async isOpen(evaluation?: FeatureFlagEvaluation): Promise<boolean> {
    try {
      const featureFlags = await this.options.featureFlags.execute(evaluation);

      return featureFlags[WAITLIST_MODE_FEATURE_FLAG] !== true;
    } catch {
      this.options.incidents.bookingModeReadFailed();

      return false;
    }
  }
}
