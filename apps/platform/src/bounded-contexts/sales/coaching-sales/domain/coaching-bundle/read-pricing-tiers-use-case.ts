import type { PriceTier } from "./coaching-bundle";
import type { PricingEligibilityPort } from "./pricing-eligibility-port";

export class ReadPricingTiersUseCase {
  constructor(
    private readonly options: { pricingEligibility: PricingEligibilityPort },
  ) {}

  async execute(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>> {
    return this.options.pricingEligibility.tiersForEmails(emails);
  }
}
