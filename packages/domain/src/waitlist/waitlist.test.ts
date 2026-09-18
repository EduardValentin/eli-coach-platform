import { describe, expect, it } from "vitest";

import { Waitlist, type WaitlistOffer } from "./waitlist";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;

describe("Waitlist.availabilityBucketStart", () => {
  it.each([
    ["2026-07-26T10:00:00.000Z", "2026-07-26T10:00:00.000Z"],
    ["2026-07-26T10:29:59.999Z", "2026-07-26T10:00:00.000Z"],
    ["2026-07-26T10:30:00.000Z", "2026-07-26T10:30:00.000Z"],
    ["2026-07-26T10:59:59.999Z", "2026-07-26T10:30:00.000Z"],
  ])("resolves %s to bucket %s", (now, expected) => {
    // arrange
    const currentTime = new Date(now);

    // act
    const bucketStart = Waitlist.availabilityBucketStart(currentTime);

    // assert
    expect(bucketStart.toISOString()).toBe(expected);
  });
});

describe("Waitlist availability", () => {
  it.each([
    [7, "available"],
    [8, "limited"],
    [9, "limited"],
    [10, "closed"],
    [11, "closed"],
  ] as const)("maps a reduced count of %i to %s", (count, expected) => {
    // arrange
    const waitlist = Waitlist.configure({
      cap: 10,
      offer: activeOffer,
    });

    // act
    const availability = waitlist.availability(count);

    // assert
    expect(availability).toBe(expected);
  });
});

describe("Waitlist.decideReducedPricingRegistration", () => {
  it.each([
    [
      { alreadyRegistered: true, cap: 10, reducedPricingCount: 10 },
      "already_registered",
    ],
    [
      { alreadyRegistered: false, cap: 10, reducedPricingCount: 10 },
      "capacity_reached",
    ],
    [{ alreadyRegistered: false, cap: 10, reducedPricingCount: 9 }, "register"],
    [
      { alreadyRegistered: false, cap: 0, reducedPricingCount: 0 },
      "capacity_reached",
    ],
  ] as const)("decides %o as %s", (input, expected) => {
    // arrange
    const decisionInput = input;

    // act
    const decision = Waitlist.decideReducedPricingRegistration(decisionInput);

    // assert
    expect(decision).toBe(expected);
  });
});
