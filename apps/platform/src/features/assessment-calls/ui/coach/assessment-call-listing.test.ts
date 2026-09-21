import { describe, expect, it } from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";

import {
  PAGE_SIZE,
  classifyCalls,
  countCallsLeftToday,
  filterCalls,
  haveOnlyListingParamsChanged,
  orderCalls,
  pageOfCalls,
  paginationSteps,
  parsePageParam,
  parseStatusParam,
  upcomingCalls,
} from "./assessment-call-listing";

const BUCHAREST = "Europe/Bucharest";
const LOS_ANGELES = "America/Los_Angeles";
const CALL_MINUTES = 30;

function callAt(
  startsAt: string,
  overrides: Partial<CoachAssessmentCall> = {},
) {
  const starts = new Date(startsAt);

  return {
    endsAt: new Date(starts.getTime() + CALL_MINUTES * 60_000).toISOString(),
    id: `call-${startsAt}`,
    joinPath: `/book/${startsAt}/join`,
    startsAt: starts.toISOString(),
    visitorEmail: "ana@example.com",
    visitorNotes: null,
    ...visitorNamed("Ana Popescu"),
    ...visitorProfile(),
    ...overrides,
  } satisfies CoachAssessmentCall;
}

function visitorNamed(fullName: string) {
  const [firstName, lastName] = fullName.split(" ");

  return { firstName, fullName, lastName };
}

function visitorProfile() {
  return {
    country: "RO",
    dateOfBirth: "1994-03-14",
    gender: "female",
    phone: null,
    primaryGoal: "build_strength",
  } as const;
}

const NOON = new Date("2026-09-20T09:00:00.000Z");

describe("classifying a coach's calls", () => {
  it("counts a call as upcoming right up to the instant it ends", () => {
    // arrange
    const call = callAt("2026-09-20T08:30:00.000Z");

    // act
    const [classified] = classifyCalls([call], {
      now: new Date("2026-09-20T08:59:59.999Z"),
      timeZone: BUCHAREST,
    });

    // assert
    expect(classified.timing).toBe("upcoming");
  });

  it("counts a call as past from the instant it ends", () => {
    // arrange
    const call = callAt("2026-09-20T08:30:00.000Z");

    // act
    const [classified] = classifyCalls([call], {
      now: new Date("2026-09-20T09:00:00.000Z"),
      timeZone: BUCHAREST,
    });

    // assert
    expect(classified.timing).toBe("past");
  });

  it("reads today from the calendar of the zone being read in", () => {
    // arrange
    const call = callAt("2026-09-20T05:00:00.000Z");

    // act
    const [inBucharest] = classifyCalls([call], {
      now: NOON,
      timeZone: BUCHAREST,
    });
    const [inLosAngeles] = classifyCalls([call], {
      now: NOON,
      timeZone: LOS_ANGELES,
    });

    // assert
    expect(inBucharest.isToday).toBe(true);
    expect(inLosAngeles.isToday).toBe(false);
  });

  it("keeps today honest across the 2026-10-25 night Europe/Bucharest leaves summer time", () => {
    // arrange
    const lateOnTheTwentyFourth = callAt("2026-10-24T21:30:00.000Z");
    const lateOnTheTwentyFifth = callAt("2026-10-25T22:30:00.000Z");
    const moment = {
      now: new Date("2026-10-25T00:30:00.000Z"),
      timeZone: BUCHAREST,
    };

    // act
    const classified = classifyCalls(
      [lateOnTheTwentyFourth, lateOnTheTwentyFifth],
      moment,
    );

    // assert
    expect(classified[0].isToday).toBe(true);
    expect(classified[1].isToday).toBe(false);
  });
});

describe("counting the calls left today", () => {
  function countLeft(starts: string[]): number {
    return countCallsLeftToday(
      classifyCalls(
        starts.map((start) => callAt(start)),
        { now: NOON, timeZone: BUCHAREST },
      ),
    );
  }

  it("counts the calls still to come today", () => {
    // arrange, act
    const left = countLeft([
      "2026-09-20T15:00:00.000Z",
      "2026-09-20T17:00:00.000Z",
    ]);

    // assert
    expect(left).toBe(2);
  });

  it("leaves out a call that already ended today", () => {
    // arrange, act
    const left = countLeft([
      "2026-09-20T05:00:00.000Z",
      "2026-09-20T15:00:00.000Z",
    ]);

    // assert
    expect(left).toBe(1);
  });

  it("keeps a call that is under way right now", () => {
    // arrange, act
    const left = countLeft(["2026-09-20T08:50:00.000Z"]);

    // assert
    expect(left).toBe(1);
  });

  it("leaves out a call that is not until tomorrow", () => {
    // arrange, act
    const left = countLeft(["2026-09-21T15:00:00.000Z"]);

    // assert
    expect(left).toBe(0);
  });
});

describe("choosing which calls to show", () => {
  const calls = classifyCalls(
    [
      callAt("2026-09-19T15:00:00.000Z", {
        id: "yesterday",
        ...visitorNamed("Bea Ionescu"),
      }),
      callAt("2026-09-20T05:00:00.000Z", {
        id: "earlier-today",
        visitorEmail: "carla@example.com",
        ...visitorNamed("Carla Marin"),
      }),
      callAt("2026-09-20T15:00:00.000Z", { id: "later-today" }),
      callAt("2026-09-22T15:00:00.000Z", { id: "next-week" }),
    ],
    { now: NOON, timeZone: BUCHAREST },
  );

  it("shows only the calls that have not ended under Upcoming", () => {
    // arrange, act
    const shown = filterCalls(calls, { query: "", status: "upcoming" });

    // assert
    expect(shown.map((call) => call.id)).toEqual(["later-today", "next-week"]);
  });

  it("shows every call starting today under Today, ended or not", () => {
    // arrange, act
    const shown = filterCalls(calls, { query: "", status: "today" });

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "earlier-today",
      "later-today",
    ]);
  });

  it("shows only the ended calls under Past", () => {
    // arrange, act
    const shown = filterCalls(calls, { query: "", status: "past" });

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "yesterday",
      "earlier-today",
    ]);
  });

  it("shows the whole history under All", () => {
    // arrange, act
    const shown = filterCalls(calls, { query: "", status: "all" });

    // assert
    expect(shown).toHaveLength(4);
  });

  it("narrows by name or address, ignoring case and stray spaces", () => {
    // arrange, act
    const byName = filterCalls(calls, { query: "  bEa ", status: "all" });
    const byEmail = filterCalls(calls, { query: "CARLA@", status: "all" });

    // assert
    expect(byName.map((call) => call.id)).toEqual(["yesterday"]);
    expect(byEmail.map((call) => call.id)).toEqual(["earlier-today"]);
  });

  it("narrows by the last name on its own", () => {
    // arrange, act
    const byLastName = filterCalls(calls, { query: "marin", status: "all" });

    // assert
    expect(byLastName.map((call) => call.id)).toEqual(["earlier-today"]);
  });

  it("puts the soonest call first and the most recent past call after them", () => {
    // arrange, act
    const ordered = orderCalls(calls);

    // assert
    expect(ordered.map((call) => call.id)).toEqual([
      "later-today",
      "next-week",
      "earlier-today",
      "yesterday",
    ]);
  });

  it("offers the dashboard only the soonest calls that have not ended", () => {
    // arrange, act
    const soonest = upcomingCalls(orderCalls(calls), 1);

    // assert
    expect(soonest.map((call) => call.id)).toEqual(["later-today"]);
  });
});

describe("reading the listing's URL", () => {
  it("falls back to Upcoming for anything it does not recognise", () => {
    // arrange, act, assert
    expect(parseStatusParam(null)).toBe("upcoming");
    expect(parseStatusParam("nonsense")).toBe("upcoming");
    expect(parseStatusParam("past")).toBe("past");
  });

  it("falls back to the first page for anything that is not a page number", () => {
    // arrange, act, assert
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam("nonsense")).toBe(1);
    expect(parsePageParam("3")).toBe(3);
  });

  it("recognises a change that only the browser has to answer", () => {
    // arrange
    const listing = new URL(
      "https://evoa.test/coach/assessment-calls?status=past",
    );
    const paged = new URL(
      "https://evoa.test/coach/assessment-calls?status=past&page=2",
    );
    const elsewhere = new URL("https://evoa.test/coach/");

    // act, assert
    expect(haveOnlyListingParamsChanged(listing, paged)).toBe(true);
    expect(haveOnlyListingParamsChanged(listing, listing)).toBe(false);
    expect(haveOnlyListingParamsChanged(listing, elsewhere)).toBe(false);
  });
});

describe("paging through the calls", () => {
  const manyCalls = classifyCalls(
    Array.from({ length: 25 }, (_, index) =>
      callAt(new Date(NOON.getTime() + (index + 1) * 3_600_000).toISOString(), {
        id: `call-${index + 1}`,
      }),
    ),
    { now: NOON, timeZone: BUCHAREST },
  );

  it("shows a page of ten and says where in the run it sits", () => {
    // arrange, act
    const view = pageOfCalls(manyCalls, { page: 2, size: PAGE_SIZE });

    // assert
    expect(view.calls.map((call) => call.id)).toEqual([
      "call-11",
      "call-12",
      "call-13",
      "call-14",
      "call-15",
      "call-16",
      "call-17",
      "call-18",
      "call-19",
      "call-20",
    ]);
    expect(view).toMatchObject({
      firstShown: 11,
      lastShown: 20,
      page: 2,
      pageCount: 3,
      total: 25,
    });
  });

  it("clamps a page past the end of the run to the last one", () => {
    // arrange, act
    const view = pageOfCalls(manyCalls, { page: 99, size: PAGE_SIZE });

    // assert
    expect(view.page).toBe(3);
    expect(view.calls).toHaveLength(5);
    expect(view.firstShown).toBe(21);
    expect(view.lastShown).toBe(25);
  });

  it("counts one empty page when there is nothing to show", () => {
    // arrange, act
    const view = pageOfCalls([], { page: 1, size: PAGE_SIZE });

    // assert
    expect(view).toMatchObject({
      firstShown: 0,
      lastShown: 0,
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });

  it("lists every page while they still fit on one row", () => {
    // arrange, act
    const steps = paginationSteps(3, 7);

    // assert
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("gaps the pages far from the one being read", () => {
    // arrange, act
    const steps = paginationSteps(5, 12);

    // assert
    expect(steps).toEqual([1, "gap", 4, 5, 6, "gap", 12]);
  });
});
