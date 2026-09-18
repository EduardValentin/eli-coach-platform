import type { WaitlistConsentVersions, WaitlistOffer } from "./waitlist";

export type ReducedPricingSignupResult =
  | { status: "registered" }
  | { status: "already_registered" }
  | { status: "capacity_reached" };

export type RegularPricingSignupResult =
  { status: "registered" } | { status: "already_registered" };

export interface WaitlistEntries {
  countReducedPricingSignupsCreatedBefore(options: {
    campaignSlug: string;
    createdBefore: Date;
  }): Promise<number>;
  registerReducedPricingSignup(options: {
    consentVersions: WaitlistConsentVersions;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<ReducedPricingSignupResult>;
  registerRegularPricingSignup(options: {
    consentVersions: WaitlistConsentVersions;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<RegularPricingSignupResult>;
}
