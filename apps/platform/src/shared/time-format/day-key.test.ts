import { describe, expect, it } from "vitest";

import { dayKeyOf } from "./day-key";

const BUCHAREST = "Europe/Bucharest";
const HONOLULU = "Pacific/Honolulu";

describe("day keys", () => {
  it("places an instant on the day it falls on in the display zone", () => {
    // arrange
    const lateInBucharest = new Date("2026-03-02T22:30:00.000Z");

    // act
    const inBucharest = dayKeyOf(lateInBucharest, BUCHAREST);
    const inHonolulu = dayKeyOf(lateInBucharest, HONOLULU);

    // assert
    expect(inBucharest).toBe("2026-03-03");
    expect(inHonolulu).toBe("2026-03-02");
  });

  it("keeps each side of a daylight-saving change on its own day", () => {
    // arrange
    const beforeTheChange = new Date("2026-10-24T21:30:00.000Z");
    const afterTheChange = new Date("2026-10-25T22:30:00.000Z");

    // act
    const before = dayKeyOf(beforeTheChange, BUCHAREST);
    const after = dayKeyOf(afterTheChange, BUCHAREST);

    // assert
    expect(before).toBe("2026-10-25");
    expect(after).toBe("2026-10-26");
  });
});
