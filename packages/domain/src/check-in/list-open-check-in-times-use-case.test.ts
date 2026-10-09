import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilitySource,
  type CoachCalendar,
  type TimeInterval,
} from "../coach-availability";

import { ListOpenCheckInTimesUseCase } from "./list-open-check-in-times-use-case";

const MONDAY_LATE_MORNING = new Date("2026-06-01T08:30:00.000Z");

function workingDays(): CoachAvailabilitySource {
  const result = CoachAvailability.from({
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startHour: 9,
    endHour: 17,
  });

  if (result.status !== "configured") {
    throw new Error(`expected a configured availability: ${result.problems}`);
  }

  return { current: vi.fn().mockResolvedValue(result.availability) };
}

function calendarBusyWith(busy: TimeInterval[]): CoachCalendar {
  return { busyFrom: vi.fn().mockResolvedValue(busy) };
}

async function openTimes(busy: TimeInterval[] = []): Promise<string[]> {
  const listOpenTimes = new ListOpenCheckInTimesUseCase({
    availability: workingDays(),
    calendar: calendarBusyWith(busy),
    clock: { now: () => MONDAY_LATE_MORNING },
  });

  const times = await listOpenTimes.execute();

  return times.map((time) => time.toISOString());
}

describe("ListOpenCheckInTimesUseCase", () => {
  it("offers nothing inside the next 24 hours", async () => {
    // arrange
    const elevenTuesdayBucharest = "2026-06-02T08:00:00.000Z";

    // act
    const times = await openTimes();

    // assert
    expect(times).not.toContain(elevenTuesdayBucharest);
    expect(times[0]).toBe("2026-06-02T09:00:00.000Z");
  });

  it("offers hourly starts up to the last hour that ends inside the window", async () => {
    // arrange
    const tuesday = "2026-06-02";

    // act
    const times = await openTimes();

    // assert
    expect(times.filter((time) => time.startsWith(tuesday))).toEqual([
      "2026-06-02T09:00:00.000Z",
      "2026-06-02T10:00:00.000Z",
      "2026-06-02T11:00:00.000Z",
      "2026-06-02T12:00:00.000Z",
      "2026-06-02T13:00:00.000Z",
    ]);
  });

  it("leaves out an hour the coach's schedule already holds", async () => {
    // arrange
    const bookedCall = {
      start: new Date("2026-06-02T10:00:00.000Z"),
      end: new Date("2026-06-02T11:00:00.000Z"),
    };

    // act
    const times = await openTimes([bookedCall]);

    // assert
    expect(times).not.toContain("2026-06-02T10:00:00.000Z");
    expect(times).toContain("2026-06-02T11:00:00.000Z");
  });

  it("reads the coach's schedule from the instant it lists", async () => {
    // arrange
    const calendar = calendarBusyWith([]);
    const listOpenTimes = new ListOpenCheckInTimesUseCase({
      availability: workingDays(),
      calendar,
      clock: { now: () => MONDAY_LATE_MORNING },
    });

    // act
    await listOpenTimes.execute();

    // assert
    expect(calendar.busyFrom).toHaveBeenCalledWith(MONDAY_LATE_MORNING);
  });

  it("offers times up to 30 days ahead and none after", async () => {
    // arrange
    const lastDay = "2026-07-01";
    const dayAfter = "2026-07-02";

    // act
    const times = await openTimes();

    // assert
    expect(times.at(-1)).toBe(`${lastDay}T13:00:00.000Z`);
    expect(times.some((time) => time.startsWith(dayAfter))).toBe(false);
  });
});
