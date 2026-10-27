import type { PriceTier } from "./coaching-bundle";
import type { PricingEligibility } from "./pricing-eligibility";

export class ReadPricingTiersUseCase {
  constructor(
    private readonly options: { pricingEligibility: PricingEligibility },
  ) {}

  async execute(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>> {
    return this.options.pricingEligibility.tiersForEmails(emails);
  }
}
