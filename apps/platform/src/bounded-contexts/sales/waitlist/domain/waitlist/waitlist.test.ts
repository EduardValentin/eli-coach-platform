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
    const waitlist = Waitlist.configure({ offer: activeOffer });

    // act
    const availability = waitlist.availability(count);

    // assert
    expect(availability).toBe(expected);
  });
});
