import { describe, expect, it } from "vitest";

import {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
} from "./coaching-bundles";

describe("coaching bundle model", () => {
  it("keeps the prototype bundle order and static pricing data", () => {
    expect(coachingBundles).toEqual([
      {
        id: "3-months",
        title: "Quarterly",
        months: 3,
        pricePerMonth: 250,
        totalPrice: 750,
      },
      {
        id: "6-months",
        title: "Biannual",
        months: 6,
        pricePerMonth: 220,
        totalPrice: 1320,
        discountBadge: "Save 12%",
        isPopular: true,
      },
      {
        id: "12-months",
        title: "Annual",
        months: 12,
        pricePerMonth: 190,
        totalPrice: 2280,
        discountBadge: "Save 24%",
        waitlistPricePerMonth: 150,
        waitlistTotalPrice: 1800,
        waitlistBadge: "Waitlist price",
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

  it("resolves normal display pricing without original prices", () => {
    const annual = coachingBundles[2];

    expect(resolveCoachingBundleDisplay({ bundle: annual, waitlistMode: false })).toEqual({
      badgeLabel: "Save 24%",
      isPopular: false,
      isWaitlistPrice: false,
      pricePerMonth: 190,
      totalPrice: 2280,
    });
  });

  it("switches only the annual tier to its waitlist price", () => {
    const quarterly = coachingBundles[0];
    const biannual = coachingBundles[1];
    const annual = coachingBundles[2];

    expect(resolveCoachingBundleDisplay({ bundle: quarterly, waitlistMode: true })).toEqual({
      isPopular: false,
      isWaitlistPrice: false,
      pricePerMonth: 250,
      totalPrice: 750,
    });
    expect(resolveCoachingBundleDisplay({ bundle: biannual, waitlistMode: true })).toEqual({
      badgeLabel: "Save 12%",
      isPopular: false,
      isWaitlistPrice: false,
      pricePerMonth: 220,
      totalPrice: 1320,
    });
    expect(resolveCoachingBundleDisplay({ bundle: annual, waitlistMode: true })).toEqual({
      badgeLabel: "Waitlist price",
      isPopular: false,
      isWaitlistPrice: true,
      originalPricePerMonth: 190,
      originalTotalPrice: 2280,
      pricePerMonth: 150,
      totalPrice: 1800,
    });
  });
});
