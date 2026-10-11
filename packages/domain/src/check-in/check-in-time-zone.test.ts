import { describe, expect, it } from "vitest";

import { CheckInTimeZone } from "./check-in-time-zone";

describe("CheckInTimeZone.from", () => {
  it("accepts a named zone under its canonical name", () => {
    // arrange
    const candidate = "Europe/London";

    // act
    const result = CheckInTimeZone.from(candidate);

    // assert
    expect(result).toEqual({
      status: "valid",
      timeZone: expect.objectContaining({ name: "Europe/London" }),
    });
  });

  it.each([["Mars/Olympus_Mons"], ["+02:00"], [""]])(
    "refuses %j as no named zone",
    (candidate) => {
      // arrange
      const raw = candidate;

      // act
      const result = CheckInTimeZone.from(raw);

      // assert
      expect(result).toEqual({ status: "invalid" });
    },
  );
});
