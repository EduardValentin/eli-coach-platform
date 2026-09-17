import { describe, expect, it } from "vitest";

import {
  coachingBundleBenefits,
  coachingBundles,
  resolveSavingsBadge,
} from "./coaching-bundles";

describe("coaching bundles", () => {
  it("keeps the prototype bundle order and permanent pricing data", () => {
    // arrange

    // act

    // assert
    expect(coachingBundles).toEqual([
      {
        id: "1-month",
        title: "1 Month",
        months: 1,
        pricePerMonth: 159,
        totalPrice: 159,
      },
      {
        id: "3-months",
        title: "3 Months",
        months: 3,
        pricePerMonth: 149,
        totalPrice: 447,
        isPopular: true,
      },
      {
        id: "6-months",
        title: "6 Months",
        months: 6,
        pricePerMonth: 139,
        totalPrice: 834,
      },
    ]);
  });

  it("keeps shared benefits separate from per-tier cards", () => {
    // arrange

    // act

    // assert
    expect(coachingBundleBenefits).toEqual([
      "Personalized workout and nutrition program",
      "Periodic progress check-ins",
      "Uninterrupted support with your coach",
      "Video form review and correction",
      "Access to the private community",
    ]);
  });
});

describe("resolveSavingsBadge", () => {
  it.each([
    [{ baselinePerMonth: 159, months: 3, pricePerMonth: 149 }, "Save 6%"],
    [{ baselinePerMonth: 139, months: 3, pricePerMonth: 125 }, "Save 10%"],
    [{ baselinePerMonth: 159, months: 1, pricePerMonth: 159 }, undefined],
    [{ baselinePerMonth: 159, months: 3, pricePerMonth: 159 }, undefined],
  ] as const)("resolves %o to %s", (input, expected) => {
    // arrange
    const badgeInput = input;

    // act
    const badge = resolveSavingsBadge(badgeInput);

    // assert
    expect(badge).toBe(expected);
  });
});
