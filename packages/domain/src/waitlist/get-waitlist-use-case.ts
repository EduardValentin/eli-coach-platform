import {
  WAITLIST_MODE_FEATURE_FLAG,
  type FeatureFlagReader,
  type FeatureFlagSet,
} from "../feature-flag";
import type { Clock } from "../shared";

import { Waitlist, type WaitlistSnapshot } from "./waitlist";
import type { WaitlistEntries } from "./waitlist-entries";
import type { WaitlistIncidents } from "./waitlist-incidents";

type GetWaitlistUseCaseOptions = {
  clock: Clock;
  featureFlags: FeatureFlagReader;
  incidents: WaitlistIncidents;
  waitlist: Waitlist;
  waitlistEntries: WaitlistEntries;
};

export class GetWaitlistUseCase {
  constructor(private readonly options: GetWaitlistUseCaseOptions) {}

  async execute(): Promise<WaitlistSnapshot> {
    const [featureFlags, reducedPricingSignupCount] = await Promise.all([
      this.getFeatureFlagsSafely(),
      this.getReducedPricingSignupCountForAvailabilitySafely(),
    ]);
    const enabled =
      featureFlags === null ||
      featureFlags[WAITLIST_MODE_FEATURE_FLAG] === true;
    const availability =
      featureFlags === null || reducedPricingSignupCount === null
        ? null
        : this.options.waitlist.availability(reducedPricingSignupCount);

    return {
      availability,
      enabled,
      offer: this.options.waitlist.offer,
    };
  }

  private async getFeatureFlagsSafely(): Promise<FeatureFlagSet | null> {
    try {
      return await this.options.featureFlags.execute();
    } catch {
      this.options.incidents.waitlistModeReadFailed();

      return null;
    }
  }

  private async getReducedPricingSignupCountForAvailabilitySafely(): Promise<
    number | null
  > {
    try {
      return await this.options.waitlistEntries.countReducedPricingSignupsCreatedBefore(
        {
          campaignSlug: this.options.waitlist.offer.campaignSlug,
          createdBefore: Waitlist.availabilityBucketStart(
            this.options.clock.now(),
          ),
        },
      );
    } catch {
      return null;
    }
  }
}
