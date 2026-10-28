import type {
  PriceTier,
  PricingEligibility,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import type { PricingEligibilitySource } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility";

export class WaitlistPricingEligibility implements PricingEligibility {
  constructor(private readonly source: PricingEligibilitySource) {}

  tierForEmail(email: string): Promise<PriceTier> {
    return this.source.tierForEmail(email);
  }

  tiersForEmails(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>> {
    return this.source.tiersForEmails(emails);
  }
}
