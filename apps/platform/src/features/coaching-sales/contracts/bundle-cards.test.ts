import { COACHING_BUNDLES } from "@eli-coach-platform/domain/coaching-bundle";
import { describe, expect, it } from "vitest";

import { formatEuros, presentBundleCards, renewalLabel } from "./bundle-cards";

describe("presentBundleCards", () => {
  it("presents the regular prices with savings against the one-month bundle", () => {
    // arrange
    const tier = "regular";

    // act
    const cards = presentBundleCards(COACHING_BUNDLES, tier);

    // assert
    expect(cards).toEqual([
      {
        billedMonthly: true,
        id: "1-month",
        isPopular: false,
        isReducedPrice: false,
        pricePerMonth: 159,
        title: "1 Month",
        total: 159,
      },
      {
        billedMonthly: false,
        id: "3-months",
        isPopular: true,
        isReducedPrice: false,
        pricePerMonth: 149,
        savingsPercent: 6,
        title: "3 Months",
        total: 447,
      },
      {
        billedMonthly: false,
        id: "6-months",
        isPopular: false,
        isReducedPrice: false,
        pricePerMonth: 139,
        savingsPercent: 12,
        title: "6 Months",
        total: 834,
      },
    ]);
  });

  it("presents the reduced prices beside the regular prices they replace", () => {
    // arrange
    const tier = "reduced";

    // act
    const cards = presentBundleCards(COACHING_BUNDLES, tier);

    // assert
    expect(cards).toEqual([
      {
        billedMonthly: true,
        id: "1-month",
        isPopular: false,
        isReducedPrice: true,
        originalPricePerMonth: 159,
        pricePerMonth: 139,
        title: "1 Month",
        total: 139,
      },
      {
        billedMonthly: false,
        id: "3-months",
        isPopular: true,
        isReducedPrice: true,
        originalPricePerMonth: 149,
        originalTotal: 447,
        pricePerMonth: 125,
        savingsPercent: 10,
        title: "3 Months",
        total: 375,
      },
      {
        billedMonthly: false,
        id: "6-months",
        isPopular: false,
        isReducedPrice: true,
        originalPricePerMonth: 139,
        originalTotal: 834,
        pricePerMonth: 119,
        savingsPercent: 14,
        title: "6 Months",
        total: 714,
      },
    ]);
  });
});

describe("renewalLabel", () => {
  it.each([
    [1, "Every month"],
    [3, "Every 3 months"],
    [6, "Every 6 months"],
  ])("words a renewal every %i months", (months, expected) => {
    // arrange
    const bundleMonths = months;

    // act
    const label = renewalLabel(bundleMonths);

    // assert
    expect(label).toBe(expected);
  });
});

describe("formatEuros", () => {
  it("prefixes whole euros with the euro sign", () => {
    // arrange
    const amount = 447;

    // act
    const formatted = formatEuros(amount);

    // assert
    expect(formatted).toBe("€447");
  });
});
