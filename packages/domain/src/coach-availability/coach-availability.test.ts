import { describe, expect, it } from "vitest";

import {
  CoachAvailability,
  SlotPolicy,
  type CoachAvailabilityProps,
  type CoachAvailabilityResult,
  type TimeInterval,
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

const HOURLY_HALF_HOUR_CALLS = SlotPolicy.of({
  durationMinutes: 30,
  bufferMinutes: 30,
  stepMinutes: 60,
  horizonDays: 30,
  leadMinutes: 120,
});

function busyBetween(start: string, end: string): TimeInterval {
  return { start: new Date(start), end: new Date(end) };
}

function configuredAvailabilityOrThrow(
  props: CoachAvailabilityProps,
): CoachAvailability {
  const result = CoachAvailability.from(props);

  if (result.status !== "configured") {
    throw new Error(
      `Expected a configured availability, got problems: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

function bucharestEvenings(): CoachAvailability {
  return configuredAvailabilityOrThrow(BUCHAREST_EVENINGS);
}

function isoStarts(starts: readonly Date[]): string[] {
  return starts.map((start) => start.toISOString());
}

describe("CoachAvailability.from", () => {
  it.each([
    [{ startHour: 20, endHour: 17 }],
    [{ startHour: 17, endHour: 17 }],
    [{ startHour: -1, endHour: 20 }],
    [{ startHour: 17, endHour: 25 }],
    [{ startHour: 17.5, endHour: 20 }],
  ])("reports invalid_hours for %o", (hours) => {
    // arrange
    const props = { ...BUCHAREST_EVENINGS, ...hours };

    // act
    const result = CoachAvailability.from(props);

    // assert
    expect(result).toEqual({ status: "invalid", problems: ["invalid_hours"] });
  });

  it.each([["Europe/Bucarest"], [""], ["UTC+2"]])(
    "reports invalid_time_zone for %o",
    (timeZone) => {
      // arrange
      const props = { ...BUCHAREST_EVENINGS, timeZone };

      // act
      const result = CoachAvailability.from(props);

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: ["invalid_time_zone"],
      });
    },
  );

  it("reports no_weekday for an empty weekday list", () => {
    // arrange
    const props = { ...BUCHAREST_EVENINGS, weekdays: [] };

    // act
    const result = CoachAvailability.from(props);

    // assert
    expect(result).toEqual({ status: "invalid", problems: ["no_weekday"] });
  });

  it("reports no_weekday for an unknown weekday", () => {
    // arrange
    const props = {
      ...BUCHAREST_EVENINGS,
      weekdays: ["moonday"] as unknown as readonly Weekday[],
    };

    // act
    const result = CoachAvailability.from(props);

    // assert
    expect(result).toEqual({ status: "invalid", problems: ["no_weekday"] });
  });

  it("collects every problem when several are invalid", () => {
    // arrange
    const props = {
      timeZone: "UTC+2",
      weekdays: [] as readonly Weekday[],
      startHour: 20,
      endHour: 17,
    };

    // act
    const result = CoachAvailability.from(props);

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: ["no_weekday", "invalid_hours", "invalid_time_zone"],
    });
  });

  it("keeps the configured window readable", () => {
    // arrange & act
    const result: CoachAvailabilityResult =
      CoachAvailability.from(BUCHAREST_EVENINGS);

    // assert
    expect(result.status).toBe("configured");
    expect(
      result.status === "configured" && {
        timeZone: result.availability.timeZone,
        weekdays: result.availability.weekdays,
        startHour: result.availability.startHour,
        endHour: result.availability.endHour,
      },
    ).toEqual({
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
    });

    // assert
    expect(isoStarts(starts)[0]).toBe("2026-06-01T16:00:00.000Z");
  });

  it("drops starts the coach is already busy for", () => {
    // arrange
    const availability = bucharestEvenings();

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T06:00:00.000Z"),
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [
        busyBetween("2026-06-01T15:00:00.000Z", "2026-06-01T16:00:00.000Z"),
        busyBetween("2026-06-08T14:00:00.000Z", "2026-06-08T15:00:00.000Z"),
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
    const availability = configuredAvailabilityOrThrow({
      ...BUCHAREST_EVENINGS,
      weekdays: ["sunday"],
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-10-25T00:00:00.000Z"),
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
    const availability = configuredAvailabilityOrThrow({
      ...BUCHAREST_EVENINGS,
      weekdays: ["sunday"],
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-03-28T00:00:00.000Z"),
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
    const availability = configuredAvailabilityOrThrow({
      ...BUCHAREST_EVENINGS,
      timeZone: "Asia/Kolkata",
    });

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-06-01T00:00:00.000Z"),
      policy: HOURLY_HALF_HOUR_CALLS,
      busy: [],
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
      policy: HOURLY_HALF_HOUR_CALLS,
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
      policy: HOURLY_HALF_HOUR_CALLS,
    });

    // assert
    expect(open).toBe(false);
  });

  it("leaves busy time to storage, so a start the calendar holds is still open", () => {
    // arrange
    const availability = bucharestEvenings();
    const busyStart = new Date("2026-06-01T15:00:00.000Z");
    const now = new Date("2026-06-01T06:00:00.000Z");

    // act
    const open = availability.isOpenStart({
      start: busyStart,
      now,
      policy: HOURLY_HALF_HOUR_CALLS,
    });

    // assert
    expect(open).toBe(true);
    expect(
      isoStarts(
        availability.openSlotStarts({
          now,
          policy: HOURLY_HALF_HOUR_CALLS,
          busy: [
            busyBetween("2026-06-01T15:00:00.000Z", "2026-06-01T16:00:00.000Z"),
          ],
        }),
      ),
    ).not.toContain(busyStart.toISOString());
  });
});

describe("CoachAvailability.openSlotStarts against busy time", () => {
  const now = new Date("2026-06-01T06:00:00.000Z");

  function firstDayStarts(busy: readonly TimeInterval[]): string[] {
    return isoStarts(
      bucharestEvenings().openSlotStarts({
        now,
        policy: HOURLY_HALF_HOUR_CALLS,
        busy,
      }),
    ).filter((start) => start.startsWith("2026-06-01"));
  }

  it("drops a start whose call overlaps busy time that is not on the grid", () => {
    // arrange
    const busy = [
      busyBetween("2026-06-01T14:15:00.000Z", "2026-06-01T14:45:00.000Z"),
    ];

    // act
    const starts = firstDayStarts(busy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
  });

  it("drops a start whose trailing buffer runs into busy time", () => {
    // arrange
    const busy = [
      busyBetween("2026-06-01T14:45:00.000Z", "2026-06-01T15:00:00.000Z"),
    ];

    // act
    const starts = firstDayStarts(busy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
  });

  it("keeps the starts that only touch busy time at its edges", () => {
    // arrange
    const busy = [
      busyBetween("2026-06-01T13:00:00.000Z", "2026-06-01T14:00:00.000Z"),
      busyBetween("2026-06-01T17:00:00.000Z", "2026-06-01T18:00:00.000Z"),
    ];

    // act
    const starts = firstDayStarts(busy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
  });

  it("drops every start a longer appointment of another kind overlaps", () => {
    // arrange
    const sixtyMinuteAppointment = busyBetween(
      "2026-06-01T15:30:00.000Z",
      "2026-06-01T16:30:00.000Z",
    );

    // act
    const starts = firstDayStarts([sixtyMinuteAppointment]);

    // assert
    expect(starts).toEqual(["2026-06-01T14:00:00.000Z"]);
  });

  it("measures the time a start needs by the policy it is asked for", () => {
    // arrange
    const busy = [
      busyBetween("2026-06-01T14:50:00.000Z", "2026-06-01T15:00:00.000Z"),
    ];
    const shortCallsWithoutBuffer = SlotPolicy.of({
      durationMinutes: 45,
      bufferMinutes: 0,
      stepMinutes: 60,
      horizonDays: 30,
      leadMinutes: 120,
    });

    // act
    const starts = isoStarts(
      bucharestEvenings().openSlotStarts({
        now,
        policy: shortCallsWithoutBuffer,
        busy,
      }),
    ).filter((start) => start.startsWith("2026-06-01"));

    // assert
    expect(starts).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
    ]);
  });

  it("drops the start busy time covers on a Bucharest clock change day", () => {
    // arrange
    const availability = configuredAvailabilityOrThrow({
      ...BUCHAREST_EVENINGS,
      weekdays: ["sunday"],
    });
    const busy = [
      busyBetween("2026-10-25T16:15:00.000Z", "2026-10-25T16:45:00.000Z"),
    ];

    // act
    const starts = availability.openSlotStarts({
      now: new Date("2026-10-25T00:00:00.000Z"),
      policy: HOURLY_HALF_HOUR_CALLS,
      busy,
    });

    // assert
    expect(isoStarts(starts).slice(0, 2)).toEqual([
      "2026-10-25T15:00:00.000Z",
      "2026-10-25T17:00:00.000Z",
    ]);
  });
});

describe("CoachAvailability horizon and lead time", () => {
  it("reads the horizon and the lead time from the policy", () => {
    // arrange
    const nextDayWithoutLead = SlotPolicy.of({
      durationMinutes: 30,
      bufferMinutes: 30,
      stepMinutes: 60,
      horizonDays: 1,
      leadMinutes: 0,
    });

    // act
    const starts = bucharestEvenings().openSlotStarts({
      now: new Date("2026-06-01T14:00:00.000Z"),
      policy: nextDayWithoutLead,
      busy: [],
    });

    // assert
    expect(isoStarts(starts)).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T16:00:00.000Z",
      "2026-06-02T14:00:00.000Z",
      "2026-06-02T15:00:00.000Z",
      "2026-06-02T16:00:00.000Z",
    ]);
  });
});

describe("CoachAvailability steps in minutes of the day", () => {
  const now = new Date("2026-06-01T06:00:00.000Z");

  function firstDayStarts(policy: SlotPolicy): string[] {
    return isoStarts(
      bucharestEvenings().openSlotStarts({ now, policy, busy: [] }),
    ).filter((start) => start.startsWith("2026-06-01"));
  }

  function policyOf(durationMinutes: number, stepMinutes: number): SlotPolicy {
    return SlotPolicy.of({
      durationMinutes,
      bufferMinutes: 0,
      stepMinutes,
      horizonDays: 0,
      leadMinutes: 0,
    });
  }

  it("offers a start every half hour for a 30-minute step", () => {
    // arrange
    const policy = policyOf(30, 30);

    // act
    const starts = firstDayStarts(policy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T14:30:00.000Z",
      "2026-06-01T15:00:00.000Z",
      "2026-06-01T15:30:00.000Z",
      "2026-06-01T16:00:00.000Z",
      "2026-06-01T16:30:00.000Z",
    ]);
  });

  it("offers a start every 45 minutes for a 45-minute step", () => {
    // arrange
    const policy = policyOf(45, 45);

    // act
    const starts = firstDayStarts(policy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T14:45:00.000Z",
      "2026-06-01T15:30:00.000Z",
      "2026-06-01T16:15:00.000Z",
    ]);
  });

  it("offers a start every hour and a half for a 90-minute step", () => {
    // arrange
    const policy = policyOf(60, 90);

    // act
    const starts = firstDayStarts(policy);

    // assert
    expect(starts).toEqual([
      "2026-06-01T14:00:00.000Z",
      "2026-06-01T15:30:00.000Z",
    ]);
  });

  it("offers only starts whose call ends inside the window", () => {
    // arrange
    const policy = policyOf(90, 120);

    // act
    const starts = firstDayStarts(policy);

    // assert
    expect(starts).toEqual(["2026-06-01T14:00:00.000Z"]);
  });

  it.each([
    ["2026-06-01T14:30:00.000Z", policyOf(30, 30), true],
    ["2026-06-01T16:30:00.000Z", policyOf(30, 30), true],
    ["2026-06-01T14:15:00.000Z", policyOf(30, 30), false],
    ["2026-06-01T14:45:00.000Z", policyOf(45, 45), true],
    ["2026-06-01T16:00:00.000Z", policyOf(90, 120), false],
  ])(
    "decides %s as open or not by the step and the window end",
    (start, policy, expected) => {
      // arrange
      const availability = bucharestEvenings();

      // act
      const open = availability.isOpenStart({
        start: new Date(start),
        now,
        policy,
      });

      // assert
      expect(open).toBe(expected);
    },
  );
});
