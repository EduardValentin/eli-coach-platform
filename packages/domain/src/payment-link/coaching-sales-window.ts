import {
  WAITLIST_MODE_FEATURE_FLAG,
  type FeatureFlagReader,
} from "../feature-flag";

import type { CoachingSalesIncidents } from "./coaching-sales-incidents";

type CoachingSalesWindowOptions = {
  featureFlags: FeatureFlagReader;
  incidents: CoachingSalesIncidents;
};

export class CoachingSalesWindow {
  constructor(private readonly options: CoachingSalesWindowOptions) {}

  async isOpen(): Promise<boolean> {
    try {
      const featureFlags = await this.options.featureFlags.execute();

      return featureFlags[WAITLIST_MODE_FEATURE_FLAG] !== true;
    } catch (error) {
      this.options.incidents.salesModeReadFailed(error);

      return false;
    }
  }
}
