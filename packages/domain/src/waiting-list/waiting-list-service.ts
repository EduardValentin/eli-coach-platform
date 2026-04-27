import type { FeatureFlagReader } from "../feature-flags";

import {
  resolveWaitingListLaunchMode,
  type WaitingListLaunchMode,
} from "./waiting-list-model";

export class WaitingListService {
  constructor(private readonly featureFlagReader: FeatureFlagReader) {}

  async getLaunchMode(): Promise<WaitingListLaunchMode> {
    try {
      return resolveWaitingListLaunchMode(await this.featureFlagReader.getFeatureFlags({}));
    } catch {
      return "waitlist";
    }
  }
}
