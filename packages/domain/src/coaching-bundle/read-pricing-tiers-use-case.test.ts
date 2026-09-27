import { describe, expect, it, vi } from "vitest";

import { EmailAddress } from "../email-address";

import type { PriceTier } from "./coaching-bundle";
import type { PricingEligibility } from "./pricing-eligibility";
import { ReadPricingTiersUseCase } from "./read-pricing-tiers-use-case";

describe("ReadPricingTiersUseCase", () => {
  it("answers the price tier each requested email holds", async () => {
    // arrange
    const tiers = new Map<string, PriceTier>([
      ["ana@example.com", "reduced"],
      ["bea@example.com", "regular"],
    ]);
    const pricingEligibility = {
      tierForEmail: vi.fn(),
      tiersForEmails: vi.fn().mockResolvedValue(tiers),
    } satisfies PricingEligibility;
    const useCase = new ReadPricingTiersUseCase({ pricingEligibility });
    const emails = [
      EmailAddress.normalize("ana@example.com"),
      EmailAddress.normalize("bea@example.com"),
    ];

    // act
    const result = await useCase.execute(emails);

    // assert
    expect(result).toBe(tiers);
    expect(pricingEligibility.tiersForEmails).toHaveBeenCalledWith(emails);
  });
});
