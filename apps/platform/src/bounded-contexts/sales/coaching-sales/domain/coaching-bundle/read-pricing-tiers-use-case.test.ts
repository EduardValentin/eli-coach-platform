import { describe, expect, it, vi } from "vitest";

import type { PriceTier } from "./coaching-bundle";
import type { PricingEligibilityPort } from "./pricing-eligibility-port";
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
    } satisfies PricingEligibilityPort;
    const useCase = new ReadPricingTiersUseCase({ pricingEligibility });
    const emails = ["ana@example.com", "bea@example.com"];

    // act
    const result = await useCase.execute(emails);

    // assert
    expect(result).toBe(tiers);
    expect(pricingEligibility.tiersForEmails).toHaveBeenCalledWith(emails);
  });
});
