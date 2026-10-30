import type { PriceTier } from "./coaching-bundle";

export interface PricingEligibilityPort {
  tierForEmail(email: string): Promise<PriceTier>;
  tiersForEmails(
    emails: readonly string[],
  ): Promise<ReadonlyMap<string, PriceTier>>;
}
