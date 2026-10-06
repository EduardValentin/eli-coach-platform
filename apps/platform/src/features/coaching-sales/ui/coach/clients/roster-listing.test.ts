import { describe, expect, it } from "vitest";

import type {
  ClientStatus,
  RosterClient,
} from "~/features/coaching-sales/contracts/coach-clients";

import {
  countsByStatus,
  emptyRosterCopy,
  emptyRosterMessage,
  filterRoster,
  formatJoinDate,
  hasActiveRosterFilters,
  haveOnlyRosterParamsChanged,
  parseRosterParams,
  rowLinkLabel,
  sortRoster,
} from "./roster-listing";

const BUCHAREST = "Europe/Bucharest";
const LOS_ANGELES = "America/Los_Angeles";
const CLIENTS_URL = "http://localhost/coach/clients";

function client(
  firstName: string,
  overrides: Partial<RosterClient> = {},
): RosterClient {
  return {
    bundleMonths: 3,
    clientId: `00000000-0000-4000-8000-${firstName.padStart(12, "0").slice(-12)}`,
    email: `${firstName.toLowerCase()}@example.com`,
    firstName,
    lastName: "Popescu",
    paidAt: "2026-09-01T09:00:00.000Z",
    status: "invited",
    needsRefund: false,
    ...overrides,
  };
}

function names(clients: readonly RosterClient[]): string[] {
  return clients.map((listed) => listed.firstName);
}

describe("reading the roster state from the URL", () => {
  it("opens on every status, no search and the newest join date first", () => {
    // arrange
    const params = new URLSearchParams();

    // act
    const parsed = parseRosterParams(params);

    // assert
    expect(parsed).toEqual({
      query: "",
      sort: { direction: "desc", key: "joined" },
      status: "all",
    });
  });

  it("keeps a status, a search, a sort key and a direction it knows", () => {
    // arrange
    const params = new URLSearchParams(
      "status=needs-details&q=ana&sort=name&dir=desc",
    );

    // act
    const parsed = parseRosterParams(params);

    // assert
    expect(parsed).toEqual({
      query: "ana",
      sort: { direction: "desc", key: "name" },
      status: "needs-details",
    });
  });

  it("sorts every other key ascending until a direction is chosen", () => {
    // arrange
    const keys = ["name", "status", "bundle"];

    // act
    const directions = keys.map(
      (key) =>
        parseRosterParams(new URLSearchParams({ sort: key })).sort.direction,
    );

    // assert
    expect(directions).toEqual(["asc", "asc", "asc"]);
  });

  it("falls back to the defaults for values it does not know", () => {
    // arrange
    const params = new URLSearchParams(
      "status=Awaiting%20review&sort=age&dir=up",
    );

    // act
    const parsed = parseRosterParams(params);

    // assert
    expect(parsed).toEqual({
      query: "",
      sort: { direction: "desc", key: "joined" },
      status: "all",
    });
  });
});

describe("filtering the roster", () => {
  const roster = [
    client("Ana", { email: "ana@example.com", status: "invited" }),
    client("Bea", { lastName: "Ionescu", status: "needs-details" }),
    client("Carla", { email: "carla@studio.ro", status: "needs-details" }),
  ];

  it("keeps only the chosen status", () => {
    // arrange
    const selection = { query: "", status: "needs-details" } as const;

    // act
    const matching = filterRoster(roster, selection);

    // assert
    expect(names(matching)).toEqual(["Bea", "Carla"]);
  });

  it("matches a trimmed search on the full name or the email, whatever its case", () => {
    // arrange
    const selections = [
      { query: "  bea ION ", status: "all" },
      { query: "STUDIO", status: "all" },
    ] as const;

    // act
    const matching = selections.map((selection) =>
      names(filterRoster(roster, selection)),
    );

    // assert
    expect(matching).toEqual([["Bea"], ["Carla"]]);
  });
});

describe("counting the clients under each status option", () => {
  it("respects the search and ignores the chosen status", () => {
    // arrange
    const roster = [
      client("Ana", { status: "invited" }),
      client("Anca", { status: "approved" }),
      client("Bea", { status: "approved" }),
    ];

    // act
    const counts = countsByStatus(roster, { query: "an", status: "invited" });

    // assert
    expect(counts).toEqual({
      active: 0,
      all: 2,
      approved: 1,
      "awaiting-review": 0,
      cancelled: 0,
      "in-review": 0,
      inactive: 0,
      invited: 1,
      "needs-details": 0,
      onboarding: 0,
    });
  });
});

describe("sorting the roster", () => {
  it("sorts by name and then by email", () => {
    // arrange
    const roster = [
      client("bea"),
      client("Ana", { email: "z@example.com" }),
      client("Ana", { email: "a@example.com", firstName: "ana" }),
    ];

    // act
    const sorted = sortRoster(roster, { direction: "asc", key: "name" });

    // assert
    expect(sorted.map((listed) => listed.email)).toEqual([
      "a@example.com",
      "z@example.com",
      "bea@example.com",
    ]);
  });

  it("sorts by status in the vocabulary's order", () => {
    // arrange
    const statuses: ClientStatus[] = ["approved", "invited", "in-review"];
    const roster = statuses.map((status) => client(status, { status }));

    // act
    const sorted = sortRoster(roster, { direction: "desc", key: "status" });

    // assert
    expect(sorted.map((listed) => listed.status)).toEqual([
      "approved",
      "in-review",
      "invited",
    ]);
  });

  it("sorts by bundle length and keeps a client without a bundle last either way", () => {
    // arrange
    const roster = [
      client("None", { bundleMonths: null }),
      client("Twelve", { bundleMonths: 12 }),
      client("Three", { bundleMonths: 3 }),
    ];

    // act
    const ascending = sortRoster(roster, { direction: "asc", key: "bundle" });
    const descending = sortRoster(roster, { direction: "desc", key: "bundle" });

    // assert
    expect(names(ascending)).toEqual(["Three", "Twelve", "None"]);
    expect(names(descending)).toEqual(["Twelve", "Three", "None"]);
  });

  it("sorts by join date and keeps a client who has not paid last either way", () => {
    // arrange
    const roster = [
      client("Unpaid", { paidAt: null }),
      client("August", { paidAt: "2026-08-01T09:00:00.000Z" }),
      client("September", { paidAt: "2026-09-01T09:00:00.000Z" }),
    ];

    // act
    const newest = sortRoster(roster, { direction: "desc", key: "joined" });
    const oldest = sortRoster(roster, { direction: "asc", key: "joined" });

    // assert
    expect(names(newest)).toEqual(["September", "August", "Unpaid"]);
    expect(names(oldest)).toEqual(["August", "September", "Unpaid"]);
  });
});

describe("the empty roster", () => {
  it("knows when a status or a search narrows the roster", () => {
    // arrange
    const selections = [
      { query: "", status: "all" },
      { query: "   ", status: "all" },
      { query: "ana", status: "all" },
      { query: "", status: "approved" },
    ] as const;

    // act
    const active = selections.map(hasActiveRosterFilters);

    // assert
    expect(active).toEqual([false, false, true, true]);
  });

  it("names the status label and the search that found nobody", () => {
    // arrange
    const selections = [
      { query: "ana", status: "needs-details" },
      { query: "", status: "needs-details" },
      { query: "ana", status: "all" },
      { query: "", status: "all" },
    ] as const;

    // act
    const messages = selections.map(emptyRosterMessage);

    // assert
    expect(messages).toEqual([
      "No clients match the Needs details status and your search.",
      "No clients match the Needs details status.",
      "No clients match your search.",
      "No clients match your filters.",
    ]);
  });

  it("says no client has paid yet when the roster itself is empty", () => {
    // arrange
    const empty = {
      rosterSize: 0,
      selection: { query: "", status: "all" },
    } as const;

    // act
    const copy = emptyRosterCopy(empty);

    // assert
    expect(copy).toEqual({
      description: "Clients appear here once they pay for a bundle.",
      title: "No clients yet",
    });
  });

  it("says no client was found when a filter hides every client", () => {
    // arrange
    const filtered = {
      rosterSize: 0,
      selection: { query: "ana", status: "all" },
    } as const;

    // act
    const copy = emptyRosterCopy(filtered);

    // assert
    expect(copy).toEqual({
      description: "No clients match your search.",
      title: "No clients found",
    });
  });
});

describe("the row link", () => {
  it("offers to review her onboarding while her answers await the coach", () => {
    // arrange
    const statuses: ClientStatus[] = [
      "awaiting-review",
      "in-review",
      "needs-details",
      "approved",
    ];

    // act
    const labels = statuses.map((status) =>
      rowLinkLabel(client("Ana", { status })),
    );

    // assert
    expect(new Set(labels)).toEqual(
      new Set(["Review onboarding for Ana Popescu"]),
    );
  });

  it("offers her details otherwise", () => {
    // arrange
    const statuses: ClientStatus[] = [
      "invited",
      "onboarding",
      "active",
      "cancelled",
      "inactive",
    ];

    // act
    const labels = statuses.map((status) =>
      rowLinkLabel(client("Ana", { lastName: "", status })),
    );

    // assert
    expect(new Set(labels)).toEqual(new Set(["View details for Ana"]));
  });
});

describe("the join date", () => {
  it("reads month, two-digit day and year on the coach's calendar", () => {
    // arrange
    const paidAt = "2026-09-04T22:30:00.000Z";

    // act
    const inBucharest = formatJoinDate(paidAt, BUCHAREST);
    const inLosAngeles = formatJoinDate(paidAt, LOS_ANGELES);

    // assert
    expect(inBucharest).toBe("Sep 05, 2026");
    expect(inLosAngeles).toBe("Sep 04, 2026");
  });
});

describe("revalidating the roster", () => {
  it("answers a status, search or sort change without the server", () => {
    // arrange
    const changes = [
      [CLIENTS_URL, `${CLIENTS_URL}?status=approved`],
      [`${CLIENTS_URL}?status=approved`, `${CLIENTS_URL}?status=approved&q=a`],
      [CLIENTS_URL, `${CLIENTS_URL}?sort=name&dir=desc`],
    ];

    // act
    const onlyRoster = changes.map(([current, next]) =>
      haveOnlyRosterParamsChanged({
        currentUrl: new URL(current),
        nextUrl: new URL(next),
      }),
    );

    // assert
    expect(onlyRoster).toEqual([true, true, true]);
  });

  it("re-reads the roster on the same URL, another page or another parameter", () => {
    // arrange
    const changes = [
      [CLIENTS_URL, CLIENTS_URL],
      [CLIENTS_URL, "http://localhost/coach"],
      [CLIENTS_URL, `${CLIENTS_URL}?page=2`],
    ];

    // act
    const onlyRoster = changes.map(([current, next]) =>
      haveOnlyRosterParamsChanged({
        currentUrl: new URL(current),
        nextUrl: new URL(next),
      }),
    );

    // assert
    expect(onlyRoster).toEqual([false, false, false]);
  });
});
