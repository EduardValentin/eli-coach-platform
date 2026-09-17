import type { Clock } from "../shared";

import { Waitlist, type WaitlistSnapshot } from "./waitlist";
import type { WaitlistEntries } from "./waitlist-entries";

type GetWaitlistUseCaseOptions = {
  clock: Clock;
  waitlist: Waitlist;
  waitlistEntries: WaitlistEntries;
};

export class GetWaitlistUseCase {
  constructor(private readonly options: GetWaitlistUseCaseOptions) {}

  async execute(): Promise<WaitlistSnapshot> {
    const reducedPricingSignupCount =
      await this.getReducedPricingSignupCountForAvailabilitySafely();

    return this.options.waitlist.snapshot(
      reducedPricingSignupCount === null
        ? null
        : this.options.waitlist.availability(reducedPricingSignupCount),
    );
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
