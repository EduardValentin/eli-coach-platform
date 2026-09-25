import { describe, expect, it } from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";

import {
  PAGE_SIZE,
  classifyCalls,
  countCallsLeftToday,
  defaultDirectionFor,
  emptyListingCopy,
  filterCalls,
  hasSearchQuery,
  haveOnlyListingParamsChanged,
  orderCalls,
  orderCallsBy,
  pageOfCalls,
  paginationSteps,
  parsePageParam,
  parseSortDirectionParam,
  toSortKey,
  toCallStatus,
  upcomingCalls,
  type CallSort,
  type ListingSelection,
} from "./assessment-call-listing";

const BUCHAREST = "Europe/Bucharest";
const LOS_ANGELES = "America/Los_Angeles";
const CALL_MINUTES = 30;
const DAY_MS = 24 * 60 * 60_000;
const BOOKED_DAYS_AHEAD = 3;

function callAt(
  startsAt: string,
  overrides: Partial<CoachAssessmentCall> = {},
) {
  const starts = new Date(startsAt);

  return {
    bookedAt: new Date(
      starts.getTime() - BOOKED_DAYS_AHEAD * DAY_MS,
    ).toISOString(),
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

function selecting(overrides: Partial<ListingSelection>): ListingSelection {
  return {
    query: "",
    status: "all",
    ...overrides,
  };
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
    const shown = filterCalls(calls, selecting({ status: "upcoming" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual(["later-today", "next-week"]);
  });

  it("shows every call starting today under Today, ended or not", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ status: "today" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "earlier-today",
      "later-today",
    ]);
  });

  it("shows only the ended calls under Past", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ status: "past" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "yesterday",
      "earlier-today",
    ]);
  });

  it("shows the whole history under All", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ status: "all" }));

    // assert
    expect(shown).toHaveLength(4);
  });

  it("narrows by name or address, ignoring case and stray spaces", () => {
    // arrange, act
    const byName = filterCalls(calls, selecting({ query: "  bEa " }));
    const byEmail = filterCalls(calls, selecting({ query: "CARLA@" }));

    // assert
    expect(byName.map((call) => call.id)).toEqual(["yesterday"]);
    expect(byEmail.map((call) => call.id)).toEqual(["earlier-today"]);
  });

  it("narrows by the last name on its own", () => {
    // arrange, act
    const byLastName = filterCalls(calls, selecting({ query: "marin" }));

    // assert
    expect(byLastName.map((call) => call.id)).toEqual(["earlier-today"]);
  });

  it("narrows by the full name as the card shows it", () => {
    // arrange, act
    const byFullName = filterCalls(calls, selecting({ query: "carla marin" }));

    // assert
    expect(byFullName.map((call) => call.id)).toEqual(["earlier-today"]);
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

describe("sorting the calls by a chosen key", () => {
  const now = new Date("2026-09-21T09:00:00.000Z");
  const calls = classifyCalls(
    [
      callAt("2026-09-19T15:00:00.000Z", {
        bookedAt: "2026-09-01T10:00:00.000Z",
        visitorEmail: "zoe@example.com",
        ...visitorNamed("Older past"),
      }),
      callAt("2026-09-24T15:00:00.000Z", {
        bookedAt: "2026-09-20T10:00:00.000Z",
        visitorEmail: "Mara@example.com",
        ...visitorNamed("Later upcoming"),
      }),
      callAt("2026-09-20T15:00:00.000Z", {
        bookedAt: "2026-09-10T10:00:00.000Z",
        visitorEmail: "anca@example.com",
        ...visitorNamed("Recent past"),
      }),
      callAt("2026-09-22T15:00:00.000Z", {
        bookedAt: "2026-09-15T10:00:00.000Z",
        visitorEmail: "bianca@example.com",
        ...visitorNamed("Next upcoming"),
      }),
    ],
    { now, timeZone: BUCHAREST },
  );

  function sorted(sort: CallSort): string[] {
    return orderCallsBy(calls, sort).map((call) => call.fullName);
  }

  it("keeps the listing order for the scheduled date by default", () => {
    // arrange
    const sort: CallSort = { direction: "desc", key: "scheduled" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Next upcoming",
      "Later upcoming",
      "Recent past",
      "Older past",
    ]);
  });

  it("reverses the whole listing order for the scheduled date", () => {
    // arrange
    const sort: CallSort = { direction: "asc", key: "scheduled" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Older past",
      "Recent past",
      "Later upcoming",
      "Next upcoming",
    ]);
  });

  it("puts the newest booking first by the booking date", () => {
    // arrange
    const sort: CallSort = { direction: "desc", key: "booked" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Later upcoming",
      "Next upcoming",
      "Recent past",
      "Older past",
    ]);
  });

  it("puts the oldest booking first when the booking date is reversed", () => {
    // arrange
    const sort: CallSort = { direction: "asc", key: "booked" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Older past",
      "Recent past",
      "Next upcoming",
      "Later upcoming",
    ]);
  });

  it("orders names A to Z regardless of case", () => {
    // arrange
    const sort: CallSort = { direction: "asc", key: "name" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Later upcoming",
      "Next upcoming",
      "Older past",
      "Recent past",
    ]);
  });

  it("orders names Z to A when reversed", () => {
    // arrange
    const sort: CallSort = { direction: "desc", key: "name" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Recent past",
      "Older past",
      "Next upcoming",
      "Later upcoming",
    ]);
  });

  it("orders email addresses A to Z regardless of case", () => {
    // arrange
    const sort: CallSort = { direction: "asc", key: "email" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Recent past",
      "Next upcoming",
      "Later upcoming",
      "Older past",
    ]);
  });

  it("orders email addresses Z to A when reversed", () => {
    // arrange
    const sort: CallSort = { direction: "desc", key: "email" };

    // act
    const ordered = sorted(sort);

    // assert
    expect(ordered).toEqual([
      "Older past",
      "Later upcoming",
      "Next upcoming",
      "Recent past",
    ]);
  });
});

describe("reading the sort from the URL", () => {
  it("accepts the four sort keys and falls back to the scheduled date", () => {
    // arrange
    const raw = ["scheduled", "booked", "name", "email", "phone", null];

    // act
    const parsed = raw.map(toSortKey);

    // assert
    expect(parsed).toEqual([
      "scheduled",
      "booked",
      "name",
      "email",
      "scheduled",
      "scheduled",
    ]);
  });

  it("starts dates newest first and text A to Z", () => {
    // arrange
    const keys = ["scheduled", "booked", "name", "email"] as const;

    // act
    const directions = keys.map(defaultDirectionFor);

    // assert
    expect(directions).toEqual(["desc", "desc", "asc", "asc"]);
  });

  it("accepts an explicit direction and falls back to the key's own", () => {
    // arrange, act
    const explicit = parseSortDirectionParam("asc", "booked");
    const missingForDate = parseSortDirectionParam(null, "booked");
    const unknownForText = parseSortDirectionParam("sideways", "name");

    // assert
    expect(explicit).toBe("asc");
    expect(missingForDate).toBe("desc");
    expect(unknownForText).toBe("asc");
  });
});

describe("reading the listing's URL", () => {
  it("falls back to All for anything it does not recognise", () => {
    // arrange, act, assert
    expect(toCallStatus(null)).toBe("all");
    expect(toCallStatus("nonsense")).toBe("all");
    expect(toCallStatus("past")).toBe("past");
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
    const sorted = new URL(
      "https://evoa.test/coach/assessment-calls?status=past&sort=name&dir=desc",
    );
    const elsewhere = new URL("https://evoa.test/coach/");

    // act, assert
    expect(haveOnlyListingParamsChanged(listing, paged)).toBe(true);
    expect(haveOnlyListingParamsChanged(listing, sorted)).toBe(true);
    expect(haveOnlyListingParamsChanged(listing, listing)).toBe(false);
    expect(haveOnlyListingParamsChanged(listing, elsewhere)).toBe(false);
  });
});

describe("the copy shown when nothing matches", () => {
  it("names the search before anything else", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ query: "zzz", status: "past" }));

    // assert
    expect(copy).toEqual({
      description: "No calls match your search.",
      title: "No calls found",
    });
  });

  it("invites the first booking when the whole history is empty", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ status: "all" }));

    // assert
    expect(copy).toEqual({
      description: "Booked assessment calls appear here.",
      title: "No calls yet",
    });
  });

  it("keeps the plain window messages for every status", () => {
    // arrange
    const statuses = ["upcoming", "today", "past"] as const;

    // act
    const copies = statuses.map((status) =>
      emptyListingCopy(selecting({ status })),
    );

    // assert
    expect(copies.map((copy) => copy.title)).toEqual([
      "No calls found",
      "No calls found",
      "No calls found",
    ]);
    expect(copies.map((copy) => copy.description)).toEqual([
      "No upcoming calls.",
      "No calls today.",
      "No past calls.",
    ]);
  });
});

describe("telling what narrows the listing", () => {
  it("counts a search only once it holds more than spaces", () => {
    // arrange
    const cases = [
      { query: "" },
      { query: "   " },
      { query: " ana " },
      { query: " ana ", status: "upcoming" as const },
    ];

    // act
    const searching = cases.map((selection) =>
      hasSearchQuery(selecting(selection)),
    );

    // assert
    expect(searching).toEqual([false, false, true, true]);
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
