// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ClientRoster,
  RosterClient,
} from "~/features/coaching-sales/contracts/coach-clients";
import {
  COACH_CLIENTS_PATH,
  coachClientPath,
} from "~/features/coaching-sales/contracts/paths";

import CoachClientsRoute, { shouldRevalidate } from "./clients-page";

const COACH_TIME_ZONE = "Europe/Bucharest";

function rosterClient(
  fullName: string,
  overrides: Partial<RosterClient> = {},
): RosterClient {
  const [firstName = "", lastName = ""] = fullName.split(" ");

  return {
    bundleMonths: 3,
    clientId: crypto.randomUUID(),
    email: `${firstName.toLowerCase()}@example.com`,
    firstName,
    lastName,
    paidAt: "2026-09-01T09:00:00.000Z",
    status: "invited",
    needsRefund: false,
    ...overrides,
  };
}

const ANA = rosterClient("Ana Popescu", {
  bundleMonths: 6,
  paidAt: "2026-09-20T22:30:00.000Z",
  status: "awaiting-review",
});
const BEA = rosterClient("Bea Ionescu", {
  bundleMonths: 1,
  email: "bea@studio.ro",
  paidAt: "2026-09-10T09:00:00.000Z",
  status: "invited",
});
const CARLA = rosterClient("Carla Marin", {
  bundleMonths: 12,
  paidAt: "2026-09-15T09:00:00.000Z",
  status: "needs-details",
});
const DANA = rosterClient("Dana Radu", {
  bundleMonths: null,
  paidAt: null,
  status: "onboarding",
});

const ROSTER = [BEA, DANA, ANA, CARLA];

beforeEach(() => {
  coachIsIn(COACH_TIME_ZONE);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the coach's clients page", () => {
  it("heads the page and says what it lists", async () => {
    // arrange, act
    await renderClientsPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage your active roster and past client records."),
    ).toBeInTheDocument();
  });

  it("lists every client, the newest join date first and a client who has not paid last", async () => {
    // arrange, act
    await renderClientsPage();

    // assert
    expect(shownNames()).toEqual([
      "Ana Popescu",
      "Carla Marin",
      "Bea Ionescu",
      "Dana Radu",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Join date" }),
    ).toHaveAttribute("aria-sort", "descending");
  });

  it("gives each client her email, status, bundle and join date on the coach's calendar", async () => {
    // arrange, act
    await renderClientsPage();

    // assert
    expect(within(bodyRows()[0]).getByText("ana@example.com")).toBeVisible();
    expect(rowCells(0)).toEqual([
      "Awaiting review",
      "6 months",
      "Sep 21, 2026",
      "",
    ]);
    expect(rowCells(3)).toEqual(["Onboarding", "—", "—", ""]);
  });

  it("offers every status in its group with the number of clients under it", async () => {
    // arrange
    const user = await renderClientsPage();

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    // assert
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "All statuses 4",
      "Invited 1",
      "Onboarding 1",
      "Awaiting review 1",
      "In review 0",
      "Needs details 1",
      "Approved 0",
      "Active 0",
      "Cancelled 0",
      "Inactive 0",
    ]);
    expect(
      within(screen.getByRole("group", { name: "Inactive" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Cancelled 0", "Inactive 0"]);
    expect(
      screen.getByRole("group", { name: "Onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Active" })).toBeInTheDocument();
  });

  it("keeps only the clients in the chosen status and puts it in the address", async () => {
    // arrange
    const { router, user } = await renderClientsRouter();
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    // act
    await user.click(screen.getByRole("option", { name: "Needs details 1" }));

    // assert
    expect(shownNames()).toEqual(["Carla Marin"]);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^Needs details$/,
    );
    expect(router.state.location.search).toBe("?status=needs-details");
  });

  it("finds a client by name or email, whatever the case, and counts only what the search finds", async () => {
    // arrange
    const { router, user } = await renderClientsRouter();

    // act
    await user.type(
      screen.getByRole("searchbox", { name: "Search clients" }),
      "STUDIO",
    );

    // assert
    expect(shownNames()).toEqual(["Bea Ionescu"]);
    expect(router.state.location.search).toBe("?q=STUDIO");
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      screen.getByRole("option", { name: "All statuses 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Invited 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Awaiting review 0" }),
    ).toBeInTheDocument();
  });

  it("sorts by a column, flips it on a second press and returns to the newest first", async () => {
    // arrange
    const { router, user } = await renderClientsRouter();
    const nameSort = () =>
      within(screen.getByRole("columnheader", { name: "Client" })).getByRole(
        "button",
      );

    // act
    await user.click(nameSort());

    // assert
    expect(shownNames()).toEqual([
      "Ana Popescu",
      "Bea Ionescu",
      "Carla Marin",
      "Dana Radu",
    ]);
    expect(router.state.location.search).toBe("?sort=name");

    // act
    await user.click(nameSort());

    // assert
    expect(shownNames()).toEqual([
      "Dana Radu",
      "Carla Marin",
      "Bea Ionescu",
      "Ana Popescu",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Client" }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(router.state.location.search).toBe("?sort=name&dir=desc");

    // act
    await user.click(
      within(screen.getByRole("columnheader", { name: "Join date" })).getByRole(
        "button",
      ),
    );

    // assert
    expect(router.state.location.search).toBe("");
    expect(shownNames()[0]).toBe("Ana Popescu");
  });

  it("sorts by status in the vocabulary's order and by bundle length with no bundle last", async () => {
    // arrange
    const user = await renderClientsPage();

    // act
    await user.click(
      within(screen.getByRole("columnheader", { name: "Status" })).getByRole(
        "button",
      ),
    );

    // assert
    expect(shownNames()).toEqual([
      "Bea Ionescu",
      "Dana Radu",
      "Ana Popescu",
      "Carla Marin",
    ]);

    // act
    await user.click(
      within(
        screen.getByRole("columnheader", { name: "Bundle / Plan" }),
      ).getByRole("button"),
    );

    // assert
    expect(shownNames()).toEqual([
      "Bea Ionescu",
      "Ana Popescu",
      "Carla Marin",
      "Dana Radu",
    ]);
  });

  it("answers filters and sorting in the browser without reading the roster again", async () => {
    // arrange
    const { loadRoster, user } = await renderClientsRouter();

    // act
    await user.type(
      screen.getByRole("searchbox", { name: "Search clients" }),
      "ana",
    );
    await user.click(
      within(screen.getByRole("columnheader", { name: "Client" })).getByRole(
        "button",
      ),
    );

    // assert
    expect(loadRoster).toHaveBeenCalledTimes(1);
  });

  it("offers to review her onboarding while her answers await the coach and her details otherwise", async () => {
    // arrange, act
    await renderClientsPage();

    // assert
    expect(
      screen.getByRole("link", { name: "Review onboarding for Ana Popescu" }),
    ).toHaveAttribute("href", coachClientPath(ANA.clientId));
    expect(
      screen.getByRole("link", { name: "Review onboarding for Carla Marin" }),
    ).toHaveAttribute("href", coachClientPath(CARLA.clientId));
    expect(
      screen.getByRole("link", { name: "View details for Bea Ionescu" }),
    ).toHaveAttribute("href", coachClientPath(BEA.clientId));
    expect(
      screen.getByRole("link", { name: "View details for Dana Radu" }),
    ).toHaveAttribute("href", coachClientPath(DANA.clientId));
  });

  it("opens a client's page from anywhere on her row", async () => {
    // arrange
    const user = await renderClientsPage();

    // act
    await user.click(screen.getByText("bea@studio.ro"));

    // assert
    expect(
      await screen.findByRole("heading", { name: `Client ${BEA.clientId}` }),
    ).toBeInTheDocument();
  });

  it("says no client has paid yet when the roster is empty", async () => {
    // arrange, act
    await renderClientsPage({ clients: [] });

    // assert
    expect(screen.getByText("No clients yet")).toBeInTheDocument();
    expect(
      screen.getByText("Clients appear here once they pay for a bundle."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("names the status and the search that found nobody and clears both", async () => {
    // arrange
    const { router, user } = await renderClientsRouter({
      url: `${COACH_CLIENTS_PATH}?status=approved&q=ana&sort=name`,
    });

    // assert
    expect(screen.getByText("No clients found")).toBeInTheDocument();
    expect(
      screen.getByText("No clients match the Approved status and your search."),
    ).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    expect(shownNames()).toEqual([
      "Ana Popescu",
      "Bea Ionescu",
      "Carla Marin",
      "Dana Radu",
    ]);
    expect(router.state.location.search).toBe("?sort=name");
  });

  it("says the clients could not be loaded when the roster is unavailable", async () => {
    // arrange, act
    await renderClientsPage({ clients: null });

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your clients could not be loaded. Try again in a moment.",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function bodyRows(): HTMLElement[] {
  const [, body] = screen.getAllByRole("rowgroup");

  return within(body).getAllByRole("row");
}

function shownNames(): string[] {
  return bodyRows().map(
    (row) =>
      within(row).getAllByRole("cell")[0].querySelector("p")?.textContent ?? "",
  );
}

function rowCells(index: number): string[] {
  return within(bodyRows()[index])
    .getAllByRole("cell")
    .slice(1)
    .map((cell) => cell.textContent ?? "");
}

function ClientPageStandIn() {
  const { clientId } = useParams();

  return <h1>{`Client ${clientId}`}</h1>;
}

type ClientsPageOptions = {
  clients?: ClientRoster["clients"];
  url?: string;
};

async function renderClientsRouter(options?: ClientsPageOptions) {
  const user = userEvent.setup();
  const roster: ClientRoster = {
    clients: options?.clients === undefined ? ROSTER : options.clients,
  };
  const loadRoster = vi.fn(() => roster);
  const router = createMemoryRouter(
    [
      {
        Component: CoachClientsRoute,
        loader: loadRoster,
        path: COACH_CLIENTS_PATH,
        shouldRevalidate,
      },
      {
        Component: ClientPageStandIn,
        path: `${COACH_CLIENTS_PATH}/:clientId`,
      },
    ],
    { initialEntries: [options?.url ?? COACH_CLIENTS_PATH] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  return { loadRoster, router, user };
}

async function renderClientsPage(options?: ClientsPageOptions) {
  const { user } = await renderClientsRouter(options);

  return user;
}
