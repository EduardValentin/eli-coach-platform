import type { PriceTier } from "./coaching-bundle";
import type { PricingEligibilityPort } from "./pricing-eligibility-port";

export class ReadPricingTiersUseCase {
  constructor(
    private readonly options: {
      pricingEligibilityPort: PricingEligibilityPort;
    },
  ) {}

  async execute(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>> {
    return this.options.pricingEligibilityPort.tiersForEmails(emails);
  }
}
