import { describe, expect, it } from "vitest";

import { StaticCoachAvailability } from "./static-coach-availability.server";

describe("StaticCoachAvailability", () => {
  it("offers the coach's weekday evening window in the coach's time zone", async () => {
    // arrange
    const source = new StaticCoachAvailability();

    // act
    const availability = await source.current();

    // assert
    expect(availability.timeZone).toBe("Europe/Bucharest");
    expect(availability.weekdays).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ]);
    expect(availability.startHour).toBe(17);
    expect(availability.endHour).toBe(20);
  });

  it("names its time zone without waiting on the source", async () => {
    // arrange
    const source = new StaticCoachAvailability();

    // act
    const named = source.timeZone;

    // assert
    expect(named).toBe((await source.current()).timeZone);
  });
});
