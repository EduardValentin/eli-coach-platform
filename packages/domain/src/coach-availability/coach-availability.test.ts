import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_CALL_RULES,
  CoachAvailability,
  type CoachAvailabilityProps,
  type Weekday,
} from "./index";

const WORKING_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const satisfies readonly Weekday[];

const BUCHAREST_EVENINGS = {
  timeZone: "Europe/Bucharest",
  weekdays: WORKING_WEEK,
  startHour: 17,
  endHour: 20,
} satisfies CoachAvailabilityProps;

function bucharestEvenings(): CoachAvailability {
  return CoachAvailability.configure(BUCHAREST_EVENINGS);
}

function isoStarts(starts: readonly Date[]): string[] {
  return starts.map((start) => start.toISOString());
}

describe("ASSESSMENT_CALL_RULES", () => {
  it("is the single home of the assessment call literals", () => {
    // arrange
    const rules = ASSESSMENT_CALL_RULES;

    // act
    const values = { ...rules };

    // assert
    expect(values).toEqual({
      durationMinutes: 30,
      bufferMinutes: 30,
      stepMinutes: 60,
      horizonDays: 30,
      leadMinutes: 120,
    });
  });
});

describe("CoachAvailability.configure", () => {
  it.each([
    [{ startHour: 20, endHour: 17 }],
    [{ startHour: 17, endHour: 17 }],
    [{ startHour: -1, endHour: 20 }],
    [{ startHour: 17, endHour: 25 }],
    [{ startHour: 17.5, endHour: 20 }],
  ])("rejects the hours %o", (hours) => {
    // arrange
    const props = { ...BUCHAREST_EVENINGS, ...hours };

    // act
    const configure = () => CoachAvailability.configure(props);

    // assert
    expect(configure).toThrow(/hours/i);
  });

  it("rejects an empty weekday list", () => {
    // arrange
    const props = { ...BUCHAREST_EVENINGS, weekdays: [] };

    // act
    const configure = () => CoachAvailability.configure(props);

    // assert
    expect(configure).toThrow(/weekday/i);
  });

  it("rejects an unknown weekday", () => {
    // arrange
    const props = {
      ...BUCHAREST_EVENINGS,
      weekdays: ["moonday"] as unknown as readonly Weekday[],
    };

    // act
    const configure = () => CoachAvailability.configure(props);

    // assert
    expect(configure).toThrow(/weekday/i);
  });

  it("keeps the configured window readable", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const configured = {
      timeZone: availability.timeZone,
      weekdays: availability.weekdays,
      startHour: availability.startHour,
      endHour: availability.endHour,
    };

    // assert
    expect(configured).toEqual({
      timeZone: "Europe/Bucharest",
      weekdays: WORKING_WEEK,
      startHour: 17,
      endHour: 20,
    });
  });
});

describe("CoachAvailability.openSlotStarts", () => {
  it("offers one start per hour with the window end exclusive", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T06:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 3)).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
  });

  it("skips days outside the configured weekdays", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-05T06:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 4)).toEqual([
      "2026-06-05T14:00:00.000Z",
      "2026-06-05T15:00:00.000Z",
      "2026-06-05T16:00:00.000Z",
      "2026-06-08T14:00:00.000Z",
    ]);
  });

  it("offers a start exactly the lead time away", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T13:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts)[0]).toBe("2026-06-01T15:00:00.000Z");
  });

  it("drops a start closer than the lead time", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T13:00:00.001Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts)[0]).toBe("2026-06-01T16:00:00.000Z");
  });

  it("drops reserved starts", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T06:00:00.000Z"),
      reservedStarts: [
        new Date("2026-06-01T15:00:00.000Z"),
        new Date("2026-06-08T14:00:00.000Z"),
      ],
    });

    // assert
    expect(isoStarts(starts).slice(0, 2)).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
    expect(isoStarts(starts)).not.toContain("2026-06-08T14:00:00.000Z");
  });

  it("ends the horizon on the last hour of today plus the horizon days", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T06:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).at(-1)).toBe("2026-07-01T16:00:00.000Z");
  });

  it("holds the evening wall clock across the Bucharest autumn change", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-10-23T06:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 6)).toEqual([
      "2026-10-23T14:00:00.000Z",
      "2026-10-23T15:00:00.000Z",
      "2026-10-23T16:00:00.000Z",
      "2026-10-26T15:00:00.000Z",
      "2026-10-26T16:00:00.000Z",
      "2026-10-26T17:00:00.000Z",
    ]);
  });

  it("holds the evening wall clock on the Bucharest autumn change day", () => {
    // arrange
    const availability = CoachAvailability.configure({
      ...BUCHAREST_EVENINGS,
      weekdays: ["sunday"],
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-10-25T00:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 3)).toEqual([
      "2026-10-25T15:00:00.000Z",
      "2026-10-25T16:00:00.000Z",
      "2026-10-25T17:00:00.000Z",
    ]);
  });

  it("holds the evening wall clock on the Bucharest spring change day", () => {
    // arrange
    const availability = CoachAvailability.configure({
      ...BUCHAREST_EVENINGS,
      weekdays: ["sunday"],
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-03-28T00:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 3)).toEqual([
      "2026-03-29T14:00:00.000Z",
      "2026-03-29T15:00:00.000Z",
      "2026-03-29T16:00:00.000Z",
    ]);
  });

  it("offers the same wall clock hours all year in a zone without a change", () => {
    // arrange
    const availability = CoachAvailability.configure({
      ...BUCHAREST_EVENINGS,
      timeZone: "Asia/Kolkata",
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T00:00:00.000Z"),
      reservedStarts: [],
    });

    // assert
    expect(isoStarts(starts).slice(0, 3)).toEqual([
      "2026-06-01T11:30:00.000Z",
      "2026-06-01T12:30:00.000Z",
      "2026-06-01T13:30:00.000Z",
    ]);
  });
});

describe("CoachAvailability.isOpenStart", () => {
  it.each([
    ["2026-06-01T15:00:00.000Z", true],
    ["2026-06-01T14:00:00.000Z", true],
    ["2026-06-01T16:00:00.000Z", true],
    ["2026-06-01T17:00:00.000Z", false],
    ["2026-06-01T13:00:00.000Z", false],
    ["2026-06-01T15:30:00.000Z", false],
    ["2026-06-06T14:00:00.000Z", false],
    ["2026-06-07T14:00:00.000Z", false],
    ["2026-07-01T16:00:00.000Z", true],
    ["2026-07-02T14:00:00.000Z", false],
    ["2026-05-29T14:00:00.000Z", false],
  ])("decides %s as %s", (start, expected) => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const open = availability.isOpenStart({
      start: new Date(start),
      now: new Date("2026-06-01T06:00:00.000Z"),
    });

    // assert
    expect(open).toBe(expected);
  });

  it("rejects a start closer than the lead time", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const open = availability.isOpenStart({
      start: new Date("2026-06-01T14:00:00.000Z"),
      now: new Date("2026-06-01T13:00:00.000Z"),
    });

    // assert
    expect(open).toBe(false);
  });

  it("accepts a start reserved elsewhere", () => {
    // arrange
    const availability = bucharestEvenings();
    const reservedStart = new Date("2026-06-01T15:00:00.000Z");
    const now = new Date("2026-06-01T06:00:00.000Z");

    // act
    const open = availability.isOpenStart({ start: reservedStart, now });

    // assert
    expect(open).toBe(true);
    expect(
      isoStarts(
        availability.openSlotStarts({ now, reservedStarts: [reservedStart] }),
      ),
    ).not.toContain(reservedStart.toISOString());
  });
});
