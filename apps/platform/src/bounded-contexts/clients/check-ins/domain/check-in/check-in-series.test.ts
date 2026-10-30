import { describe, expect, it } from "vitest";

import { CheckIn } from "./check-in";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import { CheckInSeriesRule } from "./check-in-series-rule";

const MONDAY_MORNING = new Date("2026-10-05T09:00:00.000Z");
const A_DAY_LATER = new Date("2026-10-06T09:00:00.000Z");
const DAY_15 = new Date("2026-10-19T09:00:00.000Z");

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

describe("CheckInSeries.setUp", () => {
  it("covers the bounds and starts every week at the coach's hour, keeping it across the change of clocks", () => {
    // arrange
    const bounds = CheckInSeriesBounds.of({
      from: A_DAY_LATER,
      until: new Date("2026-11-05T09:00:00.000Z"),
    });

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

describe("CheckInSeries#missingOccurrencesFor", () => {
  it("adds the weeks between an earlier program start and the first week, widening the cover", () => {
    // arrange
    const waiting = series({ coversFrom: DAY_15 });

    // act
    const { series: widened, starts } = waiting.missingOccurrencesFor(
      CheckInSeriesBounds.of({ from: A_DAY_LATER, until: SERIES.coversUntil }),
    );

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
    const { series: widened, starts } = series().missingOccurrencesFor(
      CheckInSeriesBounds.of({
        from: new Date("2026-11-03T09:00:00.000Z"),
        until: renewedUntil,
      }),
    );

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
    const late = CheckInSeriesBounds.of({
      from: new Date("2026-11-20T09:00:00.000Z"),
      until: new Date("2026-12-05T09:00:00.000Z"),
    });

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
    const within = CheckInSeriesBounds.of({
      from: new Date("2026-10-10T09:00:00.000Z"),
      until: new Date("2026-11-01T09:00:00.000Z"),
    });

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

describe("CheckInSeries#occurrencesAt", () => {
  it("makes one weekly check-in of the series per start, each with a new id", () => {
    // arrange
    let generated = 0;
    const starts = [
      new Date("2026-10-07T15:00:00.000Z"),
      new Date("2026-10-14T15:00:00.000Z"),
    ];

    // act
    const occurrences = series().occurrencesAt({
      starts,
      clientTimeZone: "Europe/London",
      availability: "closed",
      at: MONDAY_MORNING,
      newId: () => `week-${(generated += 1)}`,
    });

    // assert
    expect(
      occurrences.map(({ checkIn, availability }) => ({
        id: checkIn.id,
        seriesId: checkIn.seriesId,
        clientId: checkIn.clientId,
        kind: checkIn.kind,
        startsAt: checkIn.startsAt.toISOString(),
        clientTimeZone: checkIn.clientTimeZone,
        coachTimeZone: checkIn.coachTimeZone,
        requestedAt: checkIn.requestedAt,
        availability,
      })),
    ).toEqual([
      {
        id: "week-1",
        seriesId: "series-1",
        clientId: "client-1",
        kind: "recurring",
        startsAt: "2026-10-07T15:00:00.000Z",
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
        requestedAt: MONDAY_MORNING,
        availability: "closed",
      },
      {
        id: "week-2",
        seriesId: "series-1",
        clientId: "client-1",
        kind: "recurring",
        startsAt: "2026-10-14T15:00:00.000Z",
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
        requestedAt: MONDAY_MORNING,
        availability: "closed",
      },
    ]);
  });
});

describe("CheckInSeries#busyBesideOwnWeeks", () => {
  const WEDNESDAY_SIX_PM = {
    start: new Date("2026-10-14T15:00:00.000Z"),
    end: new Date("2026-10-14T16:00:00.000Z"),
  };
  const WEDNESDAY_HALF_PAST_SIX_PM = {
    start: new Date("2026-10-14T15:30:00.000Z"),
    end: new Date("2026-10-14T16:30:00.000Z"),
  };

  function weekAt(startsAt: Date, seriesId = "series-1"): CheckIn {
    return CheckIn.seriesOccurrence({
      id: `week-${startsAt.toISOString()}`,
      seriesId,
      clientId: "client-1",
      startsAt,
      clientTimeZone: "Europe/London",
      coachTimeZone: "Europe/Bucharest",
      at: MONDAY_MORNING,
    });
  }

  it.each([
    {
      situation: "the hour one of its weeks holds",
      weeks: [weekAt(WEDNESDAY_SIX_PM.start)],
      expected: [WEDNESDAY_HALF_PAST_SIX_PM],
    },
    {
      situation: "a clash week, which holds no hour",
      weeks: [weekAt(WEDNESDAY_SIX_PM.start).asClash()],
      expected: [WEDNESDAY_SIX_PM, WEDNESDAY_HALF_PAST_SIX_PM],
    },
    {
      situation: "a week of another series",
      weeks: [weekAt(WEDNESDAY_SIX_PM.start, "series-2")],
      expected: [WEDNESDAY_SIX_PM, WEDNESDAY_HALF_PAST_SIX_PM],
    },
  ])("leaves out $situation", ({ weeks, expected }) => {
    // arrange
    const busy = [WEDNESDAY_SIX_PM, WEDNESDAY_HALF_PAST_SIX_PM];

    // act
    const elsewhere = series().busyBesideOwnWeeks({
      busy,
      weeks,
      at: MONDAY_MORNING,
    });

    // assert
    expect(elsewhere).toEqual(expected);
  });
});
