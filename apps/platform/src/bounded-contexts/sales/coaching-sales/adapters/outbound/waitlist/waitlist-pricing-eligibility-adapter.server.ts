import type {
  PriceTier,
  PricingEligibilityPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-bundle";
import type { PricingEligibilitySourceFacade } from "~/bounded-contexts/sales/waitlist/public/pricing-eligibility-source-facade";

export class WaitlistPricingEligibilityAdapter implements PricingEligibilityPort {
  constructor(private readonly source: PricingEligibilitySourceFacade) {}

  tierForEmail(email: string): Promise<PriceTier> {
    return this.source.tierForEmail(email);
  }

  tiersForEmails(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>> {
    return this.source.tiersForEmails(emails);
  }
}
