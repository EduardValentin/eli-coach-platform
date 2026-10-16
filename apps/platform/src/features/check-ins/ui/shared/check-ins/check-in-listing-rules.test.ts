import {
  haveOnlyListingParamsChanged,
  parseSort,
  sortParams,
} from "@eli-coach-platform/ui/lib";
import { describe, expect, it } from "vitest";

import type { CoachCheckIn } from "~/features/check-ins/public/check-ins";
import { CHECK_IN_FOCUS_PARAM } from "~/features/check-ins/public/paths";

import {
  CHECK_IN_FILTER_PARAMS,
  CHECK_IN_KIND_FILTERS,
  CHECK_IN_LISTING_PARAMS,
  CHECK_IN_WAITING_FILTERS,
  CHECK_INS_PER_PAGE,
  countsByKind,
  countsByWaiting,
  dateSortRuleFor,
  hasActiveFilters,
  matchesSelection,
  openingTabOf,
  orderCheckIns,
  pageHolding,
  parseKindFilter,
  parseTab,
  parseWaitingFilter,
  tabHolding,
  type CheckInSelection,
} from "./check-in-listing-rules";

const CHECK_IN_MINUTES = 30;
const JOIN_EMPHASIS_MINUTES = 10;

function checkInAt(
  startsAt: string,
  overrides: Partial<CoachCheckIn> = {},
): CoachCheckIn {
  const starts = new Date(startsAt);

  return {
    awaitsViewer: false,
    client: { firstName: "Ana", lastName: "Popescu" },
    clientId: "0b5e6f1c-2a4d-4c8e-9f3a-1d2c3b4a5e6f",
    earlierStartsAt: null,
    endsAt: new Date(
      starts.getTime() + CHECK_IN_MINUTES * 60_000,
    ).toISOString(),
    id: `check-in-${startsAt}`,
    initiatedBy: "client",
    isWaitingRequest: false,
    joinEmphasisFrom: new Date(
      starts.getTime() - JOIN_EMPHASIS_MINUTES * 60_000,
    ).toISOString(),
    kind: "ad_hoc",
    moves: 0,
    newTimeNote: null,
    newTimeWaits: false,
    note: null,
    proposedBy: "client",
    seriesId: null,
    startsAt: starts.toISOString(),
    status: "pending",
    tab: "requests",
    viewerMayCancel: false,
    viewerMayWithdraw: false,
    viewerProposal: "allowed",
    ...overrides,
  };
}

function selecting(overrides: Partial<CheckInSelection>): CheckInSelection {
  return { kind: "any", query: "", waiting: "any", ...overrides };
}

function clientNameOf(checkIn: CoachCheckIn): string {
  return `${checkIn.client.firstName} ${checkIn.client.lastName}`;
}

function idsOf(checkIns: readonly CoachCheckIn[]): string[] {
  return checkIns.map((checkIn) => checkIn.id);
}

const anaAsks = checkInAt("2026-10-20T09:00:00.000Z", {
  awaitsViewer: true,
  id: "ana-asks",
});

const coachAsksBea = checkInAt("2026-10-21T09:00:00.000Z", {
  client: { firstName: "Bea", lastName: "Ionescu" },
  id: "coach-asks-bea",
  initiatedBy: "coach",
  proposedBy: "coach",
});

const beaWeekly = checkInAt("2026-10-22T09:00:00.000Z", {
  awaitsViewer: true,
  client: { firstName: "Bea", lastName: "Ionescu" },
  id: "bea-weekly",
  kind: "recurring",
  seriesId: "3c1a2b4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
});

const anaWeeklyWaiting = checkInAt("2026-10-23T09:00:00.000Z", {
  id: "ana-weekly-waiting",
  kind: "recurring",
  seriesId: "4d2b3c5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
});

const requests = [anaAsks, coachAsksBea, beaWeekly, anaWeeklyWaiting];

function narrowed(
  selection: CheckInSelection,
  nameOf?: (checkIn: CoachCheckIn) => string,
): string[] {
  return idsOf(
    requests.filter((checkIn) => matchesSelection(checkIn, selection, nameOf)),
  );
}

describe("narrowing a tab's check-ins", () => {
  it("keeps every check-in while nothing is chosen", () => {
    // arrange
    const selection = selecting({});

    // act
    const shown = narrowed(selection, clientNameOf);

    // assert
    expect(shown).toEqual(idsOf(requests));
  });

  it("keeps only the weekly check-ins under Weekly", () => {
    // arrange
    const selection = selecting({ kind: "recurring" });

    // act
    const shown = narrowed(selection);

    // assert
    expect(shown).toEqual(["bea-weekly", "ana-weekly-waiting"]);
  });

  it("keeps only the ad-hoc check-ins under Ad-hoc", () => {
    // arrange
    const selection = selecting({ kind: "ad-hoc" });

    // act
    const shown = narrowed(selection);

    // assert
    expect(shown).toEqual(["ana-asks", "coach-asks-bea"]);
  });

  it("keeps only the check-ins awaiting the viewer's answer", () => {
    // arrange
    const selection = selecting({ waiting: "you" });

    // act
    const shown = narrowed(selection);

    // assert
    expect(shown).toEqual(["ana-asks", "bea-weekly"]);
  });

  it("keeps only the check-ins waiting for the other party", () => {
    // arrange
    const selection = selecting({ waiting: "them" });

    // act
    const shown = narrowed(selection);

    // assert
    expect(shown).toEqual(["coach-asks-bea", "ana-weekly-waiting"]);
  });

  it("keeps a clashing week among those needing the coach's answer", () => {
    // arrange
    const clash = checkInAt("2026-10-24T09:00:00.000Z", {
      awaitsViewer: true,
      kind: "recurring",
      status: "clash",
    });

    // act
    const needsAnswer = matchesSelection(clash, selecting({ waiting: "you" }));
    const waitsForClient = matchesSelection(
      clash,
      selecting({ waiting: "them" }),
    );

    // assert
    expect(needsAnswer).toBe(true);
    expect(waitsForClient).toBe(false);
  });

  it("finds a client by first or last name, ignoring case and stray spaces", () => {
    // arrange
    const byFirstName = selecting({ query: "  bEA " });
    const byLastName = selecting({ query: "POPESCU" });

    // act
    const firstNameMatches = narrowed(byFirstName, clientNameOf);
    const lastNameMatches = narrowed(byLastName, clientNameOf);

    // assert
    expect(firstNameMatches).toEqual(["coach-asks-bea", "bea-weekly"]);
    expect(lastNameMatches).toEqual(["ana-asks", "ana-weekly-waiting"]);
  });

  it("finds a client by the full name", () => {
    // arrange
    const selection = selecting({ query: "bea ionescu" });

    // act
    const shown = narrowed(selection, clientNameOf);

    // assert
    expect(shown).toEqual(["coach-asks-bea", "bea-weekly"]);
  });

  it("ignores the search on a page that offers none", () => {
    // arrange
    const selection = selecting({ query: "bea" });

    // act
    const shown = narrowed(selection);

    // assert
    expect(shown).toEqual(idsOf(requests));
  });

  it("applies the kind, the waiting party and the search together", () => {
    // arrange
    const selection = selecting({
      kind: "recurring",
      query: "ana",
      waiting: "them",
    });

    // act
    const shown = narrowed(selection, clientNameOf);

    // assert
    expect(shown).toEqual(["ana-weekly-waiting"]);
  });

  it("keeps nothing when the choices exclude each other", () => {
    // arrange
    const selection = selecting({
      kind: "ad-hoc",
      query: "ionescu",
      waiting: "you",
    });

    // act
    const shown = narrowed(selection, clientNameOf);

    // assert
    expect(shown).toEqual([]);
  });
});

describe("counting the check-ins each filter option would show", () => {
  it("gives every offered option a count", () => {
    // arrange
    const selection = selecting({});

    // act
    const kindCounts = countsByKind(requests, selection);
    const waitingCounts = countsByWaiting(requests, selection);

    // assert
    expect(Object.keys(kindCounts).sort()).toEqual(
      [...CHECK_IN_KIND_FILTERS].sort(),
    );
    expect(Object.keys(waitingCounts).sort()).toEqual(
      [...CHECK_IN_WAITING_FILTERS].sort(),
    );
  });

  it("counts each kind under the chosen waiting party", () => {
    // arrange
    const selection = selecting({ kind: "recurring", waiting: "you" });

    // act
    const counts = countsByKind(requests, selection);

    // assert
    expect(counts).toEqual({ "ad-hoc": 1, any: 2, recurring: 1 });
  });

  it("counts each kind under the search", () => {
    // arrange
    const selection = selecting({ query: "bea" });

    // act
    const counts = countsByKind(requests, selection, clientNameOf);

    // assert
    expect(counts).toEqual({ "ad-hoc": 1, any: 2, recurring: 1 });
  });

  it("counts each waiting party under the chosen kind and the search", () => {
    // arrange
    const selection = selecting({
      kind: "ad-hoc",
      query: "ana",
      waiting: "them",
    });

    // act
    const counts = countsByWaiting(requests, selection, clientNameOf);

    // assert
    expect(counts).toEqual({ any: 1, them: 0, you: 1 });
  });

  it("counts each waiting party over the whole tab while nothing else is chosen", () => {
    // arrange
    const selection = selecting({});

    // act
    const counts = countsByWaiting(requests, selection);

    // assert
    expect(counts).toEqual({ any: 4, them: 2, you: 2 });
  });
});

describe("ordering a tab's check-ins", () => {
  const clashLater = checkInAt("2026-10-30T09:00:00.000Z", {
    awaitsViewer: true,
    id: "clash-later",
    kind: "recurring",
    status: "clash",
  });
  const clashSooner = checkInAt("2026-10-19T09:00:00.000Z", {
    awaitsViewer: true,
    id: "clash-sooner",
    kind: "recurring",
    status: "clash",
  });
  const mixed = [...requests, clashLater, clashSooner];

  it("lists Requests clashes first, then those awaiting the viewer, then the rest, soonest first", () => {
    // arrange
    const order = { direction: "asc", tab: "requests" } as const;

    // act
    const ordered = orderCheckIns(mixed, order);

    // assert
    expect(idsOf(ordered)).toEqual([
      "clash-sooner",
      "clash-later",
      "ana-asks",
      "bea-weekly",
      "coach-asks-bea",
      "ana-weekly-waiting",
    ]);
  });

  it("keeps the Requests groups and lists each latest first when reversed", () => {
    // arrange
    const order = { direction: "desc", tab: "requests" } as const;

    // act
    const ordered = orderCheckIns(mixed, order);

    // assert
    expect(idsOf(ordered)).toEqual([
      "clash-later",
      "clash-sooner",
      "bea-weekly",
      "ana-asks",
      "ana-weekly-waiting",
      "coach-asks-bea",
    ]);
  });

  it("orders the other tabs by date alone, soonest first", () => {
    // arrange
    const order = { direction: "asc", tab: "upcoming" } as const;

    // act
    const ordered = orderCheckIns(mixed, order);

    // assert
    expect(idsOf(ordered)).toEqual([
      "clash-sooner",
      "ana-asks",
      "coach-asks-bea",
      "bea-weekly",
      "ana-weekly-waiting",
      "clash-later",
    ]);
  });

  it("orders the other tabs by date alone, latest first", () => {
    // arrange
    const order = { direction: "desc", tab: "past" } as const;

    // act
    const ordered = orderCheckIns(mixed, order);

    // assert
    expect(idsOf(ordered)).toEqual([
      "clash-later",
      "ana-weekly-waiting",
      "bea-weekly",
      "coach-asks-bea",
      "ana-asks",
      "clash-sooner",
    ]);
  });

  it("leaves the list it was given untouched", () => {
    // arrange
    const given = [anaWeeklyWaiting, anaAsks];

    // act
    orderCheckIns(given, { direction: "asc", tab: "upcoming" });

    // assert
    expect(idsOf(given)).toEqual(["ana-weekly-waiting", "ana-asks"]);
  });
});

describe("reading the listing from the address", () => {
  it("accepts each tab and falls back for anything else", () => {
    // arrange
    const raw = ["upcoming", "requests", "past", "archive", null];

    // act
    const tabs = raw.map((value) => parseTab(value, "requests"));

    // assert
    expect(tabs).toEqual([
      "upcoming",
      "requests",
      "past",
      "requests",
      "requests",
    ]);
  });

  it("accepts each kind by its address word and falls back to all kinds", () => {
    // arrange
    const raw = ["recurring", "ad-hoc", "ad_hoc", "program-review", null];

    // act
    const kinds = raw.map((value) => parseKindFilter(value));

    // assert
    expect(kinds).toEqual(["recurring", "ad-hoc", "any", "any", "any"]);
  });

  it("accepts each waiting party and falls back to all requests", () => {
    // arrange
    const raw = ["you", "them", "coach", null];

    // act
    const parties = raw.map((value) => parseWaitingFilter(value));

    // assert
    expect(parties).toEqual(["you", "them", "any", "any"]);
  });

  it("starts Upcoming and Requests soonest first and Past latest first", () => {
    // arrange
    const tabs = ["upcoming", "requests", "past"] as const;

    // act
    const directions = tabs.map(
      (tab) => parseSort(dateSortRuleFor(tab), null, null).direction,
    );

    // assert
    expect(directions).toEqual(["asc", "asc", "desc"]);
  });

  it("accepts an explicit direction and falls back to the tab's own for anything else", () => {
    // arrange
    const pastRule = dateSortRuleFor("past");
    const upcomingRule = dateSortRuleFor("upcoming");

    // act
    const explicit = parseSort(pastRule, null, "asc").direction;
    const unknownOnPast = parseSort(pastRule, null, "sideways").direction;
    const unknownOnUpcoming = parseSort(upcomingRule, null, "up").direction;

    // assert
    expect(explicit).toBe("asc");
    expect(unknownOnPast).toBe("desc");
    expect(unknownOnUpcoming).toBe("asc");
  });

  it("leaves the tab's own direction out of the address", () => {
    // arrange
    const pastRule = dateSortRuleFor("past");

    // act
    const atDefault = sortParams(pastRule, { direction: "desc", key: "date" });
    const reversed = sortParams(pastRule, { direction: "asc", key: "date" });

    // assert
    expect(atDefault).toEqual({ dir: null, sort: null });
    expect(reversed).toEqual({ dir: "asc", sort: null });
  });
});

describe("the listing's place in the address", () => {
  const listingParams = Object.values(CHECK_IN_LISTING_PARAMS);
  const page = "https://evoa.test/coach/checkins";

  it("treats a change of tab, filter, search, direction or page as the listing's own", () => {
    // arrange
    const current = new URL(`${page}?view=past`);
    const next = new URL(
      `${page}?view=requests&kind=recurring&waiting=you&q=ana&dir=desc&page=2`,
    );

    // act
    const onlyListing = haveOnlyListingParamsChanged(
      current,
      next,
      listingParams,
    );

    // assert
    expect(onlyListing).toBe(true);
  });

  it("treats a new linked check-in as more than a listing change", () => {
    // arrange
    const current = new URL(`${page}?q=ana`);
    const next = new URL(`${page}?q=ana&${CHECK_IN_FOCUS_PARAM}=new-request`);

    // act
    const onlyListing = haveOnlyListingParamsChanged(
      current,
      next,
      listingParams,
    );

    // assert
    expect(onlyListing).toBe(false);
  });

  it("clears the kind, the waiting party and the search but keeps the tab and the direction", () => {
    // arrange
    const params = new URLSearchParams(
      "view=requests&kind=ad-hoc&waiting=them&q=bea&dir=desc",
    );

    // act
    for (const param of Object.values(CHECK_IN_FILTER_PARAMS)) {
      params.delete(param);
    }

    // assert
    expect(params.toString()).toBe("view=requests&dir=desc");
  });
});

describe("telling whether a filter narrows the tab", () => {
  it("counts a kind, a waiting party or a search that holds more than spaces", () => {
    // arrange
    const selections = [
      selecting({}),
      selecting({ query: "   " }),
      selecting({ kind: "recurring" }),
      selecting({ waiting: "them" }),
      selecting({ query: " ana " }),
    ];

    // act
    const narrowing = selections.map((selection) =>
      hasActiveFilters(selection),
    );

    // assert
    expect(narrowing).toEqual([false, false, true, true, true]);
  });
});

describe("choosing the tab the page opens on", () => {
  it("opens on Requests while a check-in awaits the viewer", () => {
    // arrange
    const checkIns = [coachAsksBea, anaAsks];

    // act
    const tab = openingTabOf(checkIns);

    // assert
    expect(tab).toBe("requests");
  });

  it("opens on Upcoming while nothing awaits the viewer", () => {
    // arrange
    const checkIns = [coachAsksBea, anaWeeklyWaiting];

    // act
    const tab = openingTabOf(checkIns);

    // assert
    expect(tab).toBe("upcoming");
  });

  it("names the tab holding a linked check-in", () => {
    // arrange
    const past = checkInAt("2026-10-01T09:00:00.000Z", {
      id: "past",
      status: "approved",
      tab: "past",
    });

    // act
    const tab = tabHolding("past", [anaAsks, past]);

    // assert
    expect(tab).toBe("past");
  });

  it("names no tab for a check-in the list does not hold", () => {
    // arrange
    const checkIns = [anaAsks];

    // act
    const missing = tabHolding("someone-else", checkIns);
    const absent = tabHolding(null, checkIns);

    // assert
    expect(missing).toBeUndefined();
    expect(absent).toBeUndefined();
  });
});

describe("finding the page that holds a linked check-in", () => {
  const eleven = Array.from({ length: 11 }, (_, index) =>
    checkInAt(`2026-11-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`, {
      id: `week-${index + 1}`,
    }),
  );

  it("finds a check-in among the first ten on page one", () => {
    // arrange
    const target = "week-10";

    // act
    const page = pageHolding(eleven, target, CHECK_INS_PER_PAGE);

    // assert
    expect(page).toBe(1);
  });

  it("finds the eleventh check-in on page two", () => {
    // arrange
    const target = "week-11";

    // act
    const page = pageHolding(eleven, target, CHECK_INS_PER_PAGE);

    // assert
    expect(page).toBe(2);
  });

  it("finds no page for a check-in the list does not hold", () => {
    // arrange
    const target = "week-12";

    // act
    const page = pageHolding(eleven, target, CHECK_INS_PER_PAGE);

    // assert
    expect(page).toBeNull();
  });
});
