import type { EmailAddress } from "../email-address";

import type { PriceTier } from "./coaching-bundle";

export interface PricingEligibility {
  tierForEmail(email: EmailAddress): Promise<PriceTier>;
  tiersForEmails(
    emails: readonly EmailAddress[],
  ): Promise<ReadonlyMap<string, PriceTier>>;
}
