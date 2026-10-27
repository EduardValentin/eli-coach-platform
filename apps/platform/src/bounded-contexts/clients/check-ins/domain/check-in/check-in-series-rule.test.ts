import { describe, expect, it } from "vitest";

import { CheckInSeriesBounds } from "./check-in-series-bounds";
import { CheckInSeriesRule } from "./check-in-series-rule";
import { CoachWeek } from "./open-slots";

const WEDNESDAY_EVENINGS = CheckInSeriesRule.of({
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
});

function isoOf(starts: readonly Date[]): string[] {
  return starts.map((start) => start.toISOString());
}

describe("CheckInSeriesRule#startsBetween", () => {
  it.each([
    {
      situation: "a first start on the lower bound",
      from: "2026-10-07T15:00:00.000Z",
      until: "2026-10-15T00:00:00.000Z",
      expected: ["2026-10-07T15:00:00.000Z", "2026-10-14T15:00:00.000Z"],
    },
    {
      situation: "a first start just before the lower bound",
      from: "2026-10-07T15:00:00.001Z",
      until: "2026-10-15T00:00:00.000Z",
      expected: ["2026-10-14T15:00:00.000Z"],
    },
    {
      situation: "a start on the upper bound",
      from: "2026-10-07T00:00:00.000Z",
      until: "2026-10-14T15:00:00.000Z",
      expected: ["2026-10-07T15:00:00.000Z"],
    },
    {
      situation: "no matching weekday",
      from: "2026-10-08T00:00:00.000Z",
      until: "2026-10-14T00:00:00.000Z",
      expected: [],
    },
  ])("starts the weeks with $situation", ({ from, until, expected }) => {
    // arrange
    const bounds = CheckInSeriesBounds.of({
      from: new Date(from),
      until: new Date(until),
    });

    // act
    const starts = WEDNESDAY_EVENINGS.startsBetween(bounds);

    // assert
    expect(isoOf(starts)).toEqual(expected);
  });
});

describe("CheckInSeriesRule.previewHoursOn", () => {
  it("counts, for every hour of the coach's window, the weeks in the bounds and the ones whose hour is already taken", () => {
    // arrange
    const week = CoachWeek.of({
      timeZone: "Europe/Bucharest",
      weekdays: ["monday", "wednesday", "friday"],
      hours: [17, 18, 19],
    });

    const bounds = CheckInSeriesBounds.of({
      from: new Date("2026-10-06T09:00:00.000Z"),
      until: new Date("2026-11-05T09:00:00.000Z"),
    });
    const busy = [
      {
        start: new Date("2026-10-14T15:30:00.000Z"),
        end: new Date("2026-10-14T16:30:00.000Z"),
      },
      {
        start: new Date("2026-10-28T16:00:00.000Z"),
        end: new Date("2026-10-28T17:00:00.000Z"),
      },
    ];

    // act
    const hours = CheckInSeriesRule.previewHoursOn({
      weekday: "wednesday",
      week,
      bounds,
      busy,
    });

    // assert
    expect(hours).toEqual([
      { hour: 17, occurrences: 5, clashes: 0 },
      { hour: 18, occurrences: 5, clashes: 2 },
      { hour: 19, occurrences: 5, clashes: 1 },
    ]);
  });
});
