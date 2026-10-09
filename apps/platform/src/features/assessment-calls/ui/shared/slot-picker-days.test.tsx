// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSlotPickerDays } from "./slot-picker-days";

const BUCHAREST = "Europe/Bucharest";
const HONOLULU = "Pacific/Honolulu";

const WINTER_EVENING = "2026-03-02T15:00:00.000Z";
const SUMMER_EVENING = "2026-10-23T14:00:00.000Z";

describe("the slot picker's days", () => {
  it("keeps the slots of one day together in the order they arrived, headed and labelled in the display zone", () => {
    // arrange
    const slots = [WINTER_EVENING, "2026-03-02T16:00:00.000Z", SUMMER_EVENING];

    // act
    const { result } = renderHook(() => useSlotPickerDays(slots, BUCHAREST));

    // assert
    const { days } = result.current;
    expect([...days.keys()]).toEqual(["2026-03-02", "2026-10-23"]);
    expect(days.get("2026-03-02")).toEqual({
      heading: "Monday, March 2",
      slots: [
        { label: "5:00 PM", startsAt: WINTER_EVENING },
        { label: "6:00 PM", startsAt: "2026-03-02T16:00:00.000Z" },
      ],
    });
  });

  it("regroups the same slots when the display zone changes", () => {
    // arrange
    const slots = ["2026-03-02T22:30:00.000Z"];

    // act
    const inBucharest = renderHook(() => useSlotPickerDays(slots, BUCHAREST));
    const inHonolulu = renderHook(() => useSlotPickerDays(slots, HONOLULU));

    // assert
    expect([...inBucharest.result.current.days.keys()]).toEqual(["2026-03-03"]);
    expect([...inHonolulu.result.current.days.keys()]).toEqual(["2026-03-02"]);
  });

  it("keys and names a calendar date in the display zone", () => {
    // arrange
    const midnightInBucharest = new Date("2026-03-02T22:30:00.000Z");

    // act
    const { result } = renderHook(() => useSlotPickerDays([], BUCHAREST));

    // assert
    expect(result.current.dayKeyOf(midnightInBucharest)).toBe("2026-03-03");
    expect(result.current.dayNameOf(midnightInBucharest)).toBe(
      "Tuesday, 3 March 2026",
    );
  });
});
