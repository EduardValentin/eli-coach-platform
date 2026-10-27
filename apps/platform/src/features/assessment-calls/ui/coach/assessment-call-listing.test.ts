import { parseSort, type SortChoice } from "~/shared/design-system/lib";
import { describe, expect, it } from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/public/assessment-calls";

import {
  CALL_SORT_RULE,
  classifyCalls,
  countCallsLeftToday,
  emptyListingCopy,
  filterCalls,
  hasActiveFilters,
  orderCalls,
  orderCallsBy,
  toCallWhen,
  upcomingCalls,
  type ListingSelection,
  type SortKey,
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
    when: "all",
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
    const shown = filterCalls(calls, selecting({ when: "upcoming" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual(["later-today", "next-week"]);
  });

  it("shows every call starting today under Today, ended or not", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ when: "today" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "earlier-today",
      "later-today",
    ]);
  });

  it("shows only the ended calls under Past", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ when: "past" }));

    // assert
    expect(shown.map((call) => call.id)).toEqual([
      "yesterday",
      "earlier-today",
    ]);
  });

  it("shows the whole history under All", () => {
    // arrange, act
    const shown = filterCalls(calls, selecting({ when: "all" }));

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

  function sorted(sort: SortChoice<SortKey>): string[] {
    return orderCallsBy(calls, sort).map((call) => call.fullName);
  }

  it("keeps the listing order for the scheduled date by default", () => {
    // arrange
    const sort: SortChoice<SortKey> = { direction: "desc", key: "scheduled" };

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
    const sort: SortChoice<SortKey> = { direction: "asc", key: "scheduled" };

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
    const sort: SortChoice<SortKey> = { direction: "desc", key: "booked" };

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
    const sort: SortChoice<SortKey> = { direction: "asc", key: "booked" };

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
    const sort: SortChoice<SortKey> = { direction: "asc", key: "name" };

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
    const sort: SortChoice<SortKey> = { direction: "desc", key: "name" };

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
    const sort: SortChoice<SortKey> = { direction: "asc", key: "email" };

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
    const sort: SortChoice<SortKey> = { direction: "desc", key: "email" };

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
    const keys = raw.map((key) => parseSort(CALL_SORT_RULE, key, null).key);

    // assert
    expect(keys).toEqual([
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
    const keys = ["scheduled", "booked", "name", "email"];

    // act
    const directions = keys.map(
      (key) => parseSort(CALL_SORT_RULE, key, null).direction,
    );

    // assert
    expect(directions).toEqual(["desc", "desc", "asc", "asc"]);
  });

  it("accepts an explicit direction and falls back to the key's own", () => {
    // arrange, act
    const explicit = parseSort(CALL_SORT_RULE, "booked", "asc");
    const missingForDate = parseSort(CALL_SORT_RULE, "booked", null);
    const unknownForText = parseSort(CALL_SORT_RULE, "name", "sideways");

    // assert
    expect(explicit.direction).toBe("asc");
    expect(missingForDate.direction).toBe("desc");
    expect(unknownForText.direction).toBe("asc");
  });
});

describe("reading the listing's URL", () => {
  it("falls back to All for anything it does not recognise", () => {
    // arrange, act, assert
    expect(toCallWhen(null)).toBe("all");
    expect(toCallWhen("nonsense")).toBe("all");
    expect(toCallWhen("past")).toBe("past");
  });
});

describe("the copy shown when nothing matches", () => {
  it("names the search before anything else", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ query: "zzz", when: "past" }));

    // assert
    expect(copy).toEqual({
      description: "No calls match your search.",
      title: "No calls found",
    });
  });

  it("invites the first booking when the whole history is empty", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ when: "all" }));

    // assert
    expect(copy).toEqual({
      description: "Booked assessment calls appear here.",
      title: "No calls yet",
    });
  });

  it("keeps the plain window messages for every window", () => {
    // arrange
    const windows = ["upcoming", "today", "past"] as const;

    // act
    const copies = windows.map((when) => emptyListingCopy(selecting({ when })));

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
  it("names the window and the active filter's label when the filter leaves nothing", () => {
    // arrange
    const filter = { isActive: true, label: "Payment link sent" };
    const windows = ["all", "upcoming", "today", "past"] as const;

    // act
    const copies = windows.map((when) =>
      emptyListingCopy(selecting({ when }), filter),
    );

    // assert
    expect(copies.map((copy) => copy.title)).toEqual([
      "No calls found",
      "No calls found",
      "No calls found",
      "No calls found",
    ]);
    expect(copies.map((copy) => copy.description)).toEqual([
      "No calls match the Payment link sent status.",
      "No upcoming calls match the Payment link sent status.",
      "No calls today match the Payment link sent status.",
      "No past calls match the Payment link sent status.",
    ]);
  });

  it("still names the search first while a filter is active", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ query: "zzz" }), {
      isActive: true,
      label: "Paid",
    });

    // assert
    expect(copy.description).toBe("No calls match your search.");
  });

  it("ignores a filter that is not active", () => {
    // arrange, act
    const copy = emptyListingCopy(selecting({ when: "all" }), {
      isActive: false,
      label: "All statuses",
    });

    // assert
    expect(copy.title).toBe("No calls yet");
  });
});

describe("telling what narrows the listing", () => {
  it("counts a search only once it holds more than spaces", () => {
    // arrange
    const queries = ["", "   ", " ana "];

    // act
    const narrowing = queries.map((query) =>
      hasActiveFilters(selecting({ query })),
    );

    // assert
    expect(narrowing).toEqual([false, false, true]);
  });

  it("counts any window other than All", () => {
    // arrange
    const windows = ["all", "today", "upcoming", "past"] as const;

    // act
    const narrowing = windows.map((when) =>
      hasActiveFilters(selecting({ when })),
    );

    // assert
    expect(narrowing).toEqual([false, true, true, true]);
  });

  it("counts a filter the page adds only while that filter is active", () => {
    // arrange, act
    const withActive = hasActiveFilters(selecting({}), { isActive: true });
    const withInactive = hasActiveFilters(selecting({}), { isActive: false });

    // assert
    expect(withActive).toBe(true);
    expect(withInactive).toBe(false);
  });
});
