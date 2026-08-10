import { describe, expect, it } from "vitest";

import {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
} from "./coaching-bundle-model";

describe("coaching bundle model", () => {
  it("keeps the prototype bundle order and static pricing data", () => {
    expect(coachingBundles).toEqual([
      {
        id: "1-month",
        title: "1 Month",
        months: 1,
        pricePerMonth: 159,
        totalPrice: 159,
        waitlistPricePerMonth: 139,
        waitlistTotalPrice: 139,
      },
      {
        id: "3-months",
        title: "3 Months",
        months: 3,
        pricePerMonth: 149,
        totalPrice: 447,
        isPopular: true,
        waitlistPricePerMonth: 125,
        waitlistTotalPrice: 375,
      },
      {
        id: "6-months",
        title: "6 Months",
        months: 6,
        pricePerMonth: 139,
        totalPrice: 834,
        waitlistPricePerMonth: 119,
        waitlistTotalPrice: 714,
      },
    ]);
  });

  it("keeps shared benefits separate from per-tier cards", () => {
    expect(coachingBundleBenefits).toEqual([
      "Personalized workout and nutrition program",
      "Periodic progress check-ins",
      "Uninterrupted support with your coach",
      "Video form review and correction",
      "Access to the private community",
    ]);
  });

  it("resolves normal display pricing with savings from the one-month baseline", () => {
    const threeMonthBundle = coachingBundles[1];

    expect(resolveCoachingBundleDisplay({ bundle: threeMonthBundle, waitlistMode: false })).toEqual({
      badgeLabel: "Save 6%",
      isPopular: true,
      isWaitlistPrice: false,
      pricePerMonth: 149,
      totalPrice: 447,
    });
  });

  it("switches every bundle to its waitlist price for the all-bundles offer", () => {
    const [oneMonthBundle, threeMonthBundle, sixMonthBundle] = coachingBundles;

    expect(
      resolveCoachingBundleDisplay({
        bundle: oneMonthBundle,
        waitlistMode: true,
        waitlistOfferPlan: "all-bundles",
      }),
    ).toEqual({
      isPopular: false,
      isWaitlistPrice: true,
      originalPricePerMonth: 159,
      originalTotalPrice: 159,
      pricePerMonth: 139,
      totalPrice: 139,
    });
    expect(
      resolveCoachingBundleDisplay({
        bundle: threeMonthBundle,
        waitlistMode: true,
        waitlistOfferPlan: "all-bundles",
      }),
    ).toEqual({
      badgeLabel: "Save 10%",
      isPopular: true,
      isWaitlistPrice: true,
      originalPricePerMonth: 149,
      originalTotalPrice: 447,
      pricePerMonth: 125,
      totalPrice: 375,
    });
    expect(
      resolveCoachingBundleDisplay({
        bundle: sixMonthBundle,
        waitlistMode: true,
        waitlistOfferPlan: "all-bundles",
      }),
    ).toEqual({
      badgeLabel: "Save 14%",
      isPopular: false,
      isWaitlistPrice: true,
      originalPricePerMonth: 139,
      originalTotalPrice: 834,
      pricePerMonth: 119,
      totalPrice: 714,
    });
  });
});
