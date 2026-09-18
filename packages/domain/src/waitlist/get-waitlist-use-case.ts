import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flag";
import type { Clock, Logger } from "../shared";

import { Waitlist, type WaitlistSnapshot } from "./waitlist";
import type { WaitlistEntries } from "./waitlist-entries";

type GetWaitlistUseCaseOptions = {
  clock: Clock;
  featureFlags: FeatureFlagReader;
  logger: Logger;
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
      this.options.logger.error("Waitlist mode feature flag read failed.", {
        errorCategory: "waitlist_mode_read_failure",
      });

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
