import type { ClockPort } from "../clock-port";

import { Waitlist, type WaitlistSnapshot } from "./waitlist";
import type { WaitlistEntriesPort } from "./waitlist-entries-port";
import type { WaitlistIncidentsPort } from "./waitlist-incidents-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

type GetWaitlistUseCaseOptions = {
  clock: ClockPort;
  incidents: WaitlistIncidentsPort;
  waitlist: Waitlist;
  waitlistEntries: WaitlistEntriesPort;
  waitlistMode: WaitlistModePort;
};

export class GetWaitlistUseCase {
  constructor(private readonly options: GetWaitlistUseCaseOptions) {}

  async execute(): Promise<WaitlistSnapshot> {
    const [waitlistMode, reducedPricingSignupCount] = await Promise.all([
      this.getWaitlistModeSafely(),
      this.getReducedPricingSignupCountForAvailabilitySafely(),
    ]);
    const enabled = waitlistMode === null || waitlistMode;
    const availability =
      waitlistMode === null || reducedPricingSignupCount === null
        ? null
        : this.options.waitlist.availability(reducedPricingSignupCount);

    return {
      availability,
      enabled,
      offer: this.options.waitlist.offer,
    };
  }

  private async getWaitlistModeSafely(): Promise<boolean | null> {
    try {
      return await this.options.waitlistMode.isEnabled();
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
