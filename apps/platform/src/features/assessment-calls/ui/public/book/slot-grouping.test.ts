import { describe, expect, it } from "vitest";

import { dayKeyOf, groupSlotsByDay } from "./slot-grouping";

const BUCHAREST = "Europe/Bucharest";
const HONOLULU = "Pacific/Honolulu";

const WINTER_EVENING = "2026-03-02T15:00:00.000Z";
const SUMMER_EVENING = "2026-10-23T14:00:00.000Z";

describe("slot day keys", () => {
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

describe("grouping open slots by day", () => {
  it("keeps the slots of one day together in the order they arrived", () => {
    // arrange
    const slots = [WINTER_EVENING, "2026-03-02T16:00:00.000Z", SUMMER_EVENING];

    // act
    const grouped = groupSlotsByDay(slots, BUCHAREST);

    // assert
    expect([...grouped.keys()]).toEqual(["2026-03-02", "2026-10-23"]);
    expect(grouped.get("2026-03-02")).toEqual([
      WINTER_EVENING,
      "2026-03-02T16:00:00.000Z",
    ]);
  });

  it("regroups the same slots when the display zone changes", () => {
    // arrange
    const slots = ["2026-03-02T22:30:00.000Z"];

    // act
    const inBucharest = groupSlotsByDay(slots, BUCHAREST);
    const inHonolulu = groupSlotsByDay(slots, HONOLULU);

    // assert
    expect([...inBucharest.keys()]).toEqual(["2026-03-03"]);
    expect([...inHonolulu.keys()]).toEqual(["2026-03-02"]);
  });
});
