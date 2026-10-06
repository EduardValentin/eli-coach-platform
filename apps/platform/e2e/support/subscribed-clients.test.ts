import { describe, expect, it } from "vitest";

import { paidThrough } from "./subscribed-clients";

describe("paidThrough", () => {
  it("keeps the payment's day and time three calendar months on", () => {
    // arrange
    const paidAt = new Date("2026-10-03T09:15:00Z");

    // act
    const accessEnd = paidThrough(paidAt);

    // assert
    expect(accessEnd).toEqual(new Date("2027-01-03T09:15:00Z"));
  });

  it("lands on the last day of a shorter month", () => {
    // arrange
    const paidAt = new Date("2026-11-30T18:00:00Z");

    // act
    const accessEnd = paidThrough(paidAt);

    // assert
    expect(accessEnd).toEqual(new Date("2027-02-28T18:00:00Z"));
  });
});
