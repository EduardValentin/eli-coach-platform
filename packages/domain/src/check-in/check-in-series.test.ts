import { describe, expect, it } from "vitest";

import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesRule } from "./check-in-series-rule";

const MONDAY_MORNING = new Date("2026-10-05T09:00:00.000Z");
const A_DAY_LATER = new Date("2026-10-06T09:00:00.000Z");
const DAY_15 = new Date("2026-10-19T09:00:00.000Z");
const PAID_THROUGH = new Date("2027-01-05T09:00:00.000Z");

const WEDNESDAY_EVENINGS = CheckInSeriesRule.of({
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
});

const SERIES = {
  id: "series-1",
  clientId: "client-1",
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: A_DAY_LATER,
  coversUntil: new Date("2026-11-05T09:00:00.000Z"),
  setUpAt: MONDAY_MORNING,
  changedAt: null,
  stoppedAt: null,
} satisfies CheckInSeriesSnapshot;

function series(props?: Partial<CheckInSeriesSnapshot>): CheckInSeries {
  return CheckInSeries.reconstitute({ ...SERIES, ...props });
}

function isoOf(starts: readonly Date[]): string[] {
  return starts.map((start) => start.toISOString());
}

describe("CheckInSeries.boundsFor", () => {
  it.each([
    {
      situation:
        "an immediate start, from the first day at least 24 hours away",
      programStartsAt: MONDAY_MORNING,
      coachingEndsAt: null,
      expected: { from: A_DAY_LATER, until: PAID_THROUGH },
    },
    {
      situation: "a waiting start, from her program start on day 15",
      programStartsAt: DAY_15,
      coachingEndsAt: null,
      expected: { from: DAY_15, until: PAID_THROUGH },
    },
    {
      situation: "a coaching end before her paid-through date, until the end",
      programStartsAt: MONDAY_MORNING,
      coachingEndsAt: new Date("2026-12-01T10:00:00.000Z"),
      expected: {
        from: A_DAY_LATER,
        until: new Date("2026-12-01T10:00:00.000Z"),
      },
    },
    {
      situation:
        "a coaching end after her paid-through date, until paid through",
      programStartsAt: MONDAY_MORNING,
      coachingEndsAt: new Date("2027-02-01T10:00:00.000Z"),
      expected: { from: A_DAY_LATER, until: PAID_THROUGH },
    },
    {
      situation: "a coaching end within the next 24 hours, as nothing",
      programStartsAt: MONDAY_MORNING,
      coachingEndsAt: A_DAY_LATER,
      expected: "nothing_to_create",
    },
  ])("bounds $situation", ({ programStartsAt, coachingEndsAt, expected }) => {
    // arrange
    const reading = {
      now: MONDAY_MORNING,
      lead: CHECK_IN_RULES,
      programStartsAt,
      paidThrough: PAID_THROUGH,
      coachingEndsAt,
    };

    // act
    const bounds = CheckInSeries.boundsFor(reading);

    // assert
    expect(bounds).toEqual(expected);
  });
});

describe("CheckInSeries.setUp", () => {
  it("covers the bounds and starts every week at the coach's hour, keeping it across the change of clocks", () => {
    // arrange
    const bounds = {
      from: A_DAY_LATER,
      until: new Date("2026-11-05T09:00:00.000Z"),
    };

    // act
    const { series: setUp, starts } = CheckInSeries.setUp({
      id: "series-1",
      clientId: "client-1",
      rule: WEDNESDAY_EVENINGS,
      bounds,
      at: MONDAY_MORNING,
    });

    // assert
    expect(setUp.toSnapshot()).toEqual(SERIES);
    expect(isoOf(starts)).toEqual([
      "2026-10-07T15:00:00.000Z",
      "2026-10-14T15:00:00.000Z",
      "2026-10-21T15:00:00.000Z",
      "2026-10-28T16:00:00.000Z",
      "2026-11-04T16:00:00.000Z",
    ]);
  });
});

describe("CheckInSeries#occurrenceStartsBetween", () => {
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
    const bounds = { from: new Date(from), until: new Date(until) };

    // act
    const starts = series().occurrenceStartsBetween(bounds);

    // assert
    expect(isoOf(starts)).toEqual(expected);
  });
});

describe("CheckInSeries#missingOccurrencesFor", () => {
  it("adds the weeks between an earlier program start and the first week, widening the cover", () => {
    // arrange
    const waiting = series({ coversFrom: DAY_15 });

    // act
    const { series: widened, starts } = waiting.missingOccurrencesFor({
      from: A_DAY_LATER,
      until: SERIES.coversUntil,
    });

    // assert
    expect(isoOf(starts)).toEqual([
      "2026-10-07T15:00:00.000Z",
      "2026-10-14T15:00:00.000Z",
    ]);
    expect(widened.toSnapshot()).toEqual({
      ...SERIES,
      coversFrom: A_DAY_LATER,
    });
  });

  it("adds the renewed period's weeks after the cover, widening it to the new paid-through date", () => {
    // arrange
    const renewedUntil = new Date("2026-12-05T09:00:00.000Z");

    // act
    const { series: widened, starts } = series().missingOccurrencesFor({
      from: new Date("2026-11-03T09:00:00.000Z"),
      until: renewedUntil,
    });

    // assert
    expect(isoOf(starts)).toEqual([
      "2026-11-11T16:00:00.000Z",
      "2026-11-18T16:00:00.000Z",
      "2026-11-25T16:00:00.000Z",
      "2026-12-02T16:00:00.000Z",
    ]);
    expect(widened.toSnapshot()).toEqual({
      ...SERIES,
      coversUntil: renewedUntil,
    });
  });

  it("adds no week before the bounds when a renewal arrives after the cover ended", () => {
    // arrange
    const late = {
      from: new Date("2026-11-20T09:00:00.000Z"),
      until: new Date("2026-12-05T09:00:00.000Z"),
    };

    // act
    const { starts } = series().missingOccurrencesFor(late);

    // assert
    expect(isoOf(starts)).toEqual([
      "2026-11-25T16:00:00.000Z",
      "2026-12-02T16:00:00.000Z",
    ]);
  });

  it("adds nothing when the cover already holds the bounds", () => {
    // arrange
    const within = {
      from: new Date("2026-10-10T09:00:00.000Z"),
      until: new Date("2026-11-01T09:00:00.000Z"),
    };

    // act
    const { series: kept, starts } = series().missingOccurrencesFor(within);

    // assert
    expect(starts).toEqual([]);
    expect(kept.toSnapshot()).toEqual(SERIES);
  });
});

describe("CheckInSeries#changedTo", () => {
  it("moves the rule from the next matching day at least 24 hours away to the end of the cover", () => {
    // arrange
    const tuesdayNoon = new Date("2026-10-13T12:00:00.000Z");
    const thursdayEvenings = CheckInSeriesRule.of({
      weekday: "thursday",
      hour: 19,
      timeZone: "Europe/Bucharest",
    });

    // act
    const { series: changed, starts } = series().changedTo({
      rule: thursdayEvenings,
      now: tuesdayNoon,
      lead: CHECK_IN_RULES,
    });

    // assert
    expect(changed.toSnapshot()).toEqual({
      ...SERIES,
      weekday: "thursday",
      hour: 19,
      changedAt: tuesdayNoon,
    });
    expect(isoOf(starts)).toEqual([
      "2026-10-15T16:00:00.000Z",
      "2026-10-22T16:00:00.000Z",
      "2026-10-29T17:00:00.000Z",
    ]);
  });

  it("starts from the next day of the week when it is still 24 hours away", () => {
    // arrange
    const tuesdayNoon = new Date("2026-10-13T12:00:00.000Z");

    // act
    const { starts } = series().changedTo({
      rule: WEDNESDAY_EVENINGS,
      now: tuesdayNoon,
      lead: CHECK_IN_RULES,
    });

    // assert
    expect(isoOf(starts)[0]).toBe("2026-10-14T15:00:00.000Z");
  });

  it("never starts before the cover when changed before a waiting program start", () => {
    // arrange
    const waiting = series({ coversFrom: DAY_15 });

    // act
    const { starts } = waiting.changedTo({
      rule: WEDNESDAY_EVENINGS,
      now: MONDAY_MORNING,
      lead: CHECK_IN_RULES,
    });

    // assert
    expect(isoOf(starts)[0]).toBe("2026-10-21T15:00:00.000Z");
  });
});

describe("CheckInSeries#nextWeekStartFrom", () => {
  it("names the week of the series that starts next, at the coach's hour", () => {
    // act
    const next = series().nextWeekStartFrom(
      new Date("2026-10-13T12:00:00.000Z"),
    );

    // assert
    expect(next).toEqual(new Date("2026-10-14T15:00:00.000Z"));
  });

  it("names the following week once that day's hour has passed", () => {
    // act
    const next = series().nextWeekStartFrom(
      new Date("2026-10-14T16:00:00.000Z"),
    );

    // assert
    expect(next).toEqual(new Date("2026-10-21T15:00:00.000Z"));
  });

  it("names the week starting at the very instant asked", () => {
    // act
    const next = series().nextWeekStartFrom(
      new Date("2026-10-14T15:00:00.000Z"),
    );

    // assert
    expect(next).toEqual(new Date("2026-10-14T15:00:00.000Z"));
  });
});

describe("CheckInSeries#stop", () => {
  it("records when the series stopped", () => {
    // arrange
    const active = series();

    // act
    const stopped = active.stop(A_DAY_LATER);

    // assert
    expect({
      stopped: stopped.isStopped(),
      active: active.isStopped(),
      snapshot: stopped.toSnapshot(),
    }).toEqual({
      stopped: true,
      active: false,
      snapshot: { ...SERIES, stoppedAt: A_DAY_LATER },
    });
  });
});

describe("CheckInSeriesRule#previewBetween", () => {
  it("counts the weeks in the bounds and the ones whose hour is already taken", () => {
    // arrange
    const bounds = {
      from: A_DAY_LATER,
      until: new Date("2026-11-05T09:00:00.000Z"),
    };
    const busy = [
      {
        start: new Date("2026-10-14T15:30:00.000Z"),
        end: new Date("2026-10-14T16:30:00.000Z"),
      },
      {
        start: new Date("2026-10-28T15:00:00.000Z"),
        end: new Date("2026-10-28T16:00:00.000Z"),
      },
    ];

    // act
    const preview = WEDNESDAY_EVENINGS.previewBetween({ bounds, busy });

    // assert
    expect(preview).toEqual({ hour: 18, occurrences: 5, clashes: 1 });
  });
});
