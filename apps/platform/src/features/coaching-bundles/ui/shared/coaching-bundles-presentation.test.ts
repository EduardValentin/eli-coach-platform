import { describe, expect, it } from "vitest";

import { presentCoachingBundles } from "./coaching-bundles-presentation";

describe("presentCoachingBundles", () => {
  it("presents permanent pricing labels when no offer plan is given", () => {
    // arrange
    const input = { offerPlan: null };

    // act
    const cards = presentCoachingBundles(input);

    // assert
    expect(cards).toEqual([
      {
        billingLabel: "Billed monthly",
        id: "1-month",
        isPopular: false,
        isWaitlistPrice: false,
        priceLabel: "€159",
        title: "1 Month",
        totalLabel: "€159",
      },
      {
        badgeLabel: "Save 6%",
        billingLabel: "Billed as €447",
        id: "3-months",
        isPopular: true,
        isWaitlistPrice: false,
        priceLabel: "€149",
        title: "3 Months",
        totalLabel: "€447",
      },
      {
        badgeLabel: "Save 12%",
        billingLabel: "Billed as €834",
        id: "6-months",
        isPopular: false,
        isWaitlistPrice: false,
        priceLabel: "€139",
        title: "6 Months",
        totalLabel: "€834",
      },
    ]);
  });

  it("presents waitlist pricing labels and badges for the all-bundles offer plan", () => {
    // arrange
    const input = { offerPlan: "all-bundles" as const };

    // act
    const cards = presentCoachingBundles(input);

    // assert
    expect(cards).toEqual([
      {
        billingLabel: "Billed monthly",
        id: "1-month",
        isPopular: false,
        isWaitlistPrice: true,
        originalPriceLabel: "€159",
        originalTotalLabel: "€159",
        priceLabel: "€139",
        title: "1 Month",
        totalLabel: "€139",
      },
      {
        badgeLabel: "Save 10%",
        billingLabel: "Billed as €375",
        id: "3-months",
        isPopular: true,
        isWaitlistPrice: true,
        originalPriceLabel: "€149",
        originalTotalLabel: "€447",
        priceLabel: "€125",
        title: "3 Months",
        totalLabel: "€375",
      },
      {
        badgeLabel: "Save 14%",
        billingLabel: "Billed as €714",
        id: "6-months",
        isPopular: false,
        isWaitlistPrice: true,
        originalPriceLabel: "€139",
        originalTotalLabel: "€834",
        priceLabel: "€119",
        title: "6 Months",
        totalLabel: "€714",
      },
    ]);
  });

  it("gives the one-month card its permanent total as originalTotalLabel under a waitlist plan", () => {
    // arrange
    const input = { offerPlan: "all-bundles" as const };

    // act
    const [oneMonthCard] = presentCoachingBundles(input);

    // assert
    expect(oneMonthCard.originalTotalLabel).toBe("€159");
    expect(oneMonthCard.billingLabel).toBe("Billed monthly");
  });
});
