import type { WaitlistSignupPricing } from "~/bounded-contexts/sales/waitlist/domain/waitlist";

export interface PricingEligibilitySourceFacade {
  tierForEmail(email: string): Promise<WaitlistSignupPricing>;
  tiersForEmails(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, WaitlistSignupPricing>>;
}
