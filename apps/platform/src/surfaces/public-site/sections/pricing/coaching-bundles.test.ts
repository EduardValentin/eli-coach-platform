import { describe, expect, it } from "vitest";

import { presentCoachingBundles } from "./coaching-bundles";

describe("presentCoachingBundles", () => {
  it("presents permanent pricing when no offer plan is given", () => {
    // arrange
    const input = { waitlistPricing: false };

    // act
    const { cards } = presentCoachingBundles(input);

    // assert
    expect(cards).toEqual([
      {
        billedMonthly: true,
        id: "1-month",
        isPopular: false,
        isWaitlistPrice: false,
        pricePerMonth: 159,
        title: "1 Month",
        total: 159,
      },
      {
        savingsPercent: 6,
        billedMonthly: false,
        id: "3-months",
        isPopular: true,
        isWaitlistPrice: false,
        pricePerMonth: 149,
        title: "3 Months",
        total: 447,
      },
      {
        savingsPercent: 12,
        billedMonthly: false,
        id: "6-months",
        isPopular: false,
        isWaitlistPrice: false,
        pricePerMonth: 139,
        title: "6 Months",
        total: 834,
      },
    ]);
  });

  it("presents waitlist pricing and savings for the all-bundles offer plan", () => {
    // arrange
    const input = { waitlistPricing: true };

    // act
    const { cards } = presentCoachingBundles(input);

    // assert
    expect(cards).toEqual([
      {
        billedMonthly: true,
        id: "1-month",
        isPopular: false,
        isWaitlistPrice: true,
        originalPricePerMonth: 159,
        pricePerMonth: 139,
        title: "1 Month",
        total: 139,
      },
      {
        savingsPercent: 10,
        billedMonthly: false,
        id: "3-months",
        isPopular: true,
        isWaitlistPrice: true,
        originalPricePerMonth: 149,
        originalTotal: 447,
        pricePerMonth: 125,
        title: "3 Months",
        total: 375,
      },
      {
        savingsPercent: 14,
        billedMonthly: false,
        id: "6-months",
        isPopular: false,
        isWaitlistPrice: true,
        originalPricePerMonth: 139,
        originalTotal: 834,
        pricePerMonth: 119,
        title: "6 Months",
        total: 714,
      },
    ]);
  });

  it("gives the one-month card no original total under a waitlist plan, only monthly billing", () => {
    // arrange
    const input = { waitlistPricing: true };

    // act
    const { cards } = presentCoachingBundles(input);
    const [oneMonthCard] = cards;

    // assert
    expect(oneMonthCard.originalTotal).toBeUndefined();
    expect(oneMonthCard.billedMonthly).toBe(true);
  });

  it("marks waitlist pricing as shown only when an offer plan is given", () => {
    // arrange
    const withoutOffer = { waitlistPricing: false };
    const withOffer = { waitlistPricing: true };

    // act
    const permanent = presentCoachingBundles(withoutOffer);
    const waitlist = presentCoachingBundles(withOffer);

    // assert
    expect(permanent.showsWaitlistPricing).toBe(false);
    expect(waitlist.showsWaitlistPricing).toBe(true);
  });

  it("exposes the shared benefits alongside the cards", () => {
    // arrange
    const input = { waitlistPricing: false };

    // act
    const { benefits } = presentCoachingBundles(input);

    // assert
    expect(benefits).toEqual([
      "Personalized workout and nutrition program",
      "Periodic progress check-ins",
      "Uninterrupted support with your coach",
      "Video form review and correction",
      "Access to the private community",
    ]);
  });
});
