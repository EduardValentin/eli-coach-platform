import { describe, expect, it } from "vitest";

import { coachingBundles } from "./coaching-bundles";
import { resolveCoachingBundleDisplay, WAITLIST_BUNDLE_OFFERS } from "./bundle-offers";

describe("resolveCoachingBundleDisplay", () => {
  it("resolves permanent pricing with savings from the one-month baseline when no offer is given", () => {
    // arrange
    const threeMonthBundle = coachingBundles[1];

    // act
    const display = resolveCoachingBundleDisplay({ bundle: threeMonthBundle });

    // assert
    expect(display).toEqual({
      badgeLabel: "Save 6%",
      isPopular: true,
      isWaitlistPrice: false,
      pricePerMonth: 149,
      totalPrice: 447,
    });
  });

  it("keeps permanent pricing for the one-month bundle, which never carries a savings badge", () => {
    // arrange
    const oneMonthBundle = coachingBundles[0];

    // act
    const display = resolveCoachingBundleDisplay({ bundle: oneMonthBundle });

    // assert
    expect(display).toEqual({
      isPopular: false,
      isWaitlistPrice: false,
      pricePerMonth: 159,
      totalPrice: 159,
    });
  });

  it("switches every bundle to the all-bundles waitlist offer price", () => {
    // arrange
    const [oneMonthBundle, threeMonthBundle, sixMonthBundle] = coachingBundles;
    const offer = WAITLIST_BUNDLE_OFFERS["all-bundles"];

    // act
    const oneMonthDisplay = resolveCoachingBundleDisplay({ bundle: oneMonthBundle, offer });
    const threeMonthDisplay = resolveCoachingBundleDisplay({ bundle: threeMonthBundle, offer });
    const sixMonthDisplay = resolveCoachingBundleDisplay({ bundle: sixMonthBundle, offer });

    // assert
    expect(oneMonthDisplay).toEqual({
      isPopular: false,
      isWaitlistPrice: true,
      originalPricePerMonth: 159,
      originalTotalPrice: 159,
      pricePerMonth: 139,
      totalPrice: 139,
    });
    expect(threeMonthDisplay).toEqual({
      badgeLabel: "Save 10%",
      isPopular: true,
      isWaitlistPrice: true,
      originalPricePerMonth: 149,
      originalTotalPrice: 447,
      pricePerMonth: 125,
      totalPrice: 375,
    });
    expect(sixMonthDisplay).toEqual({
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
