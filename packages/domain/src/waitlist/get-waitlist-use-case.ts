import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flag";
import type { Clock } from "../shared";

import { Waitlist, type WaitlistSnapshot } from "./waitlist";
import type { WaitlistEntries } from "./waitlist-entries";

type GetWaitlistUseCaseOptions = {
  clock: Clock;
  featureFlags: FeatureFlagReader;
  waitlist: Waitlist;
  waitlistEntries: WaitlistEntries;
};

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export class GetWaitlistUseCase {
  constructor(private readonly options: GetWaitlistUseCaseOptions) {}

  async execute(): Promise<WaitlistSnapshot> {
    const [featureFlags, reducedPricingSignupCount] = await Promise.all([
      this.getFeatureFlagsSafely(),
      this.getReducedPricingSignupCountForAvailabilitySafely(),
    ]);
    const mode =
      featureFlags === null || featureFlags[WAITLIST_MODE_FEATURE_FLAG] === true
        ? "enabled"
        : "disabled";
    const availability =
      featureFlags === null || reducedPricingSignupCount === null
        ? null
        : this.options.waitlist.availability(reducedPricingSignupCount);

    return this.options.waitlist.snapshot({ availability, mode });
  }

  private async getFeatureFlagsSafely(): Promise<FeatureFlagSet | null> {
    try {
      return await this.options.featureFlags.execute();
    } catch {
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
