import { describe, expect, it } from "vitest";

import {
  COACHING_BUNDLES,
  DEFAULT_COACHING_BUNDLE_ID,
  findCoachingBundle,
  getCoachingBundle,
  type CoachingBundleId,
  type PriceTier,
} from "./coaching-bundle";

describe("CoachingBundle", () => {
  it.each<[CoachingBundleId, PriceTier, number, number]>([
    ["1-month", "regular", 159, 159],
    ["1-month", "reduced", 139, 139],
    ["3-months", "regular", 149, 447],
    ["3-months", "reduced", 125, 375],
    ["6-months", "regular", 139, 834],
    ["6-months", "reduced", 119, 714],
  ])(
    "%s at the %s tier costs %i per month and %i in total",
    (id, tier, expectedPerMonth, expectedTotal) => {
      // arrange
      const bundle = getCoachingBundle(id);

      // act
      const perMonth = bundle.perMonth(tier);
      const total = bundle.total(tier);

      // assert
      expect(perMonth).toBe(expectedPerMonth);
      expect(total).toBe(expectedTotal);
    },
  );

  it.each<[PriceTier, number]>([
    ["regular", 44700],
    ["reduced", 37500],
  ])("3-months at the %s tier charges %i cents", (tier, expectedCents) => {
    // arrange
    const bundle = getCoachingBundle("3-months");

    // act
    const cents = bundle.totalCents(tier);

    // assert
    expect(cents).toBe(expectedCents);
  });
});

describe("findCoachingBundle", () => {
  it("resolves a known bundle id", () => {
    // act
    const bundle = findCoachingBundle("6-months");

    // assert
    expect(bundle).toMatchObject({
      id: "6-months",
      title: "6 Months",
      months: 6,
    });
  });

  it("answers null for an unknown bundle id", () => {
    // act
    const bundle = findCoachingBundle("12-months");

    // assert
    expect(bundle).toBeNull();
  });
});

describe("getCoachingBundle", () => {
  it("resolves every catalog bundle by its id", () => {
    // act
    const bundles = COACHING_BUNDLES.map((bundle) =>
      getCoachingBundle(bundle.id),
    );

    // assert
    expect(bundles).toEqual(COACHING_BUNDLES);
  });
});

describe("COACHING_BUNDLES", () => {
  it("lists the bundles in order and marks only 3 months as popular", () => {
    // act
    const bundles = COACHING_BUNDLES.map((bundle) => ({
      id: bundle.id,
      popular: bundle.popular,
    }));

    // assert
    expect(bundles).toEqual([
      { id: "1-month", popular: false },
      { id: "3-months", popular: true },
      { id: "6-months", popular: false },
    ]);
  });

  it("defaults to the 3 months bundle", () => {
    // assert
    expect(DEFAULT_COACHING_BUNDLE_ID).toBe("3-months");
  });
});
