import { describe, expect, it } from "vitest";

import {
  getWaitlistAvailabilityBucketStart,
  resolveWaitlistAvailability,
} from "./waitlist-availability";

describe("getWaitlistAvailabilityBucketStart", () => {
  it.each([
    ["2026-07-26T10:00:00.000Z", "2026-07-26T10:00:00.000Z"],
    ["2026-07-26T10:29:59.999Z", "2026-07-26T10:00:00.000Z"],
    ["2026-07-26T10:30:00.000Z", "2026-07-26T10:30:00.000Z"],
    ["2026-07-26T10:59:59.999Z", "2026-07-26T10:30:00.000Z"],
  ])("resolves %s to bucket %s", (now, expected) => {
    // arrange
    const currentTime = new Date(now);

    // act
    const bucketStart = getWaitlistAvailabilityBucketStart(currentTime);

    // assert
    expect(bucketStart.toISOString()).toBe(expected);
  });
});

describe("resolveWaitlistAvailability", () => {
  it.each([
    [7, "available"],
    [8, "limited"],
    [9, "limited"],
    [10, "closed"],
    [11, "closed"],
  ] as const)("maps a reduced count of %i to %s", (count, expected) => {
    // arrange
    const options = { cap: 10, reducedPricingSignupCount: count };

    // act
    const availability = resolveWaitlistAvailability(options);

    // assert
    expect(availability).toBe(expected);
  });
});
