// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";
import type { SalesStates } from "~/features/coaching-sales/contracts/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

import CoachAssessmentCallsRoute, {
  ErrorBoundary as CoachAssessmentCallsErrorBoundary,
  shouldRevalidate,
} from "./assessment-calls";

const COACH_TIME_ZONE = "Europe/Bucharest";
const KIRITIMATI = "Pacific/Kiritimati";
const NOW = new Date("2026-09-20T09:00:00.000Z");
const CALL_MINUTES = 30;
const DAY_MS = 24 * 60 * 60_000;
const BOOKED_DAYS_AHEAD = 3;

function call(
  startsAt: string,
  overrides: Partial<CoachAssessmentCall> = {},
): CoachAssessmentCall {
  const starts = new Date(startsAt);

  return {
    bookedAt: new Date(
      starts.getTime() - BOOKED_DAYS_AHEAD * DAY_MS,
    ).toISOString(),
    endsAt: new Date(starts.getTime() + CALL_MINUTES * 60_000).toISOString(),
    id: startsAt,
    joinPath: `/book/${startsAt}/join`,
    startsAt: starts.toISOString(),
    visitorEmail: "ana@example.com",
    visitorNotes: null,
    ...visitorNamed("Ana Popescu"),
    ...VISITOR_PROFILE,
    ...overrides,
  };
}

function visitorNamed(fullName: string) {
  const [firstName, lastName] = fullName.split(" ");

  return { firstName, fullName, lastName };
}

const VISITOR_PROFILE = {
  country: "RO",
  dateOfBirth: "1994-03-14",
  gender: "female",
  phone: null,
  primaryGoal: "build_strength",
} as const;

const YESTERDAY = call("2026-09-19T15:00:00.000Z", {
  id: "yesterday",
  visitorEmail: "bea@example.com",
  ...visitorNamed("Bea Ionescu"),
});
const EARLIER_TODAY = call("2026-09-20T05:00:00.000Z", {
  id: "earlier-today",
  visitorEmail: "carla@example.com",
  ...visitorNamed("Carla Marin"),
});
const LATER_TODAY = call("2026-09-20T15:00:00.000Z", {
  id: "later-today",
  phone: "+40712345678",
  primaryGoal: "lose_weight",
  visitorNotes: "Wants to talk about\nher glute programme",
});
const NEXT_WEEK = call("2026-09-22T15:00:00.000Z", {
  id: "next-week",
  visitorEmail: "dana@example.com",
  ...visitorNamed("Dana Radu"),
});

const FOUR_CALLS = [YESTERDAY, EARLIER_TODAY, LATER_TODAY, NEXT_WEEK];

const BOTH_ENDED_CALLS_HELD: SalesStates = {
  "earlier-today": "held",
  yesterday: "held",
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("TZ", COACH_TIME_ZONE);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("the coach's assessment calls page", () => {
  it("heads the page and says whose calls it lists", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Assessment calls" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Everyone who booked a call with you."),
    ).toBeInTheDocument();
  });

  it("names no time zone, because every time is the reader's own", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(screen.queryByText(/Times in /)).not.toBeInTheDocument();
  });

  it("opens on every call, the ones still to come soonest first and then the ended ones", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getByRole("tab", { name: "All", selected: true }),
    ).toBeInTheDocument();
    expect(shownCallNames()).toEqual([
      "Ana Popescu",
      "Dana Radu",
      "Carla Marin",
      "Bea Ionescu",
    ]);
  });

  it("offers the filters in the prototype's order", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "All",
      "Today",
      "Upcoming",
      "Past",
    ]);
  });

  it("gives each call its attendee, its moment, its address and its notes", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    const soonest = within(shownCalls()[0]);

    expect(soonest.getByText("Sun, Sep 20")).toBeInTheDocument();
    expect(soonest.getByText("· 6:00 PM")).toBeInTheDocument();
    expect(
      soonest.getByRole("link", { name: /ana@example.com/ }),
    ).toHaveAttribute("href", "mailto:ana@example.com");
    expect(
      soonest.getByText(/Wants to talk about\s+her glute programme/),
    ).toBeInTheDocument();
  });

  it("shows each visitor's age, gender, goal, country and phone", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    const [soonest, next] = shownCalls().map((item) => within(item));

    expect(
      soonest.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["Age", "Gender", "Goal", "Country"]);
    expect(
      soonest.getAllByRole("definition").map((entry) => entry.textContent),
    ).toEqual(["32 (14 Mar 1994)", "Female", "Lose weight", "Romania"]);
    expect(soonest.getByRole("link", { name: "+40712345678" })).toHaveAttribute(
      "href",
      "tel:+40712345678",
    );
    expect(next.queryByRole("link", { name: /^\+/ })).not.toBeInTheDocument();
  });

  it("finds a visitor by her last name alone", async () => {
    // arrange
    const user = await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=all`,
    });

    // act
    await user.type(screen.getByLabelText("Search calls"), "Radu");

    // assert
    await waitFor(() => {
      expect(shownCallNames()).toEqual(["Dana Radu"]);
    });
  });

  it("badges the calls that fall today in the reader's own zone", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    const calls = shownCalls();

    expect(within(calls[0]).getByText("Today")).toBeInTheDocument();
    expect(within(calls[1]).queryByText("Today")).not.toBeInTheDocument();
  });

  it("reads the day and today from the browser's zone, where the Bucharest evening is already tomorrow", async () => {
    // arrange
    vi.stubEnv("TZ", KIRITIMATI);

    // act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=upcoming`,
    });

    // assert
    const shown = within(
      await screen.findByRole("list", { name: "Assessment calls" }),
    );

    await waitFor(() => {
      expect(shown.getByText("Mon, Sep 21")).toBeInTheDocument();
    });
    expect(shown.queryByText("Today")).not.toBeInTheDocument();
  });

  it("offers a join link only while a call has not ended", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));

    // assert
    expect(
      screen.queryByRole("link", { name: "Join call" }),
    ).not.toBeInTheDocument();
  });

  it("badges every held call Call held beside the visitor's name and offers only the payment link", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));

    // assert
    for (const shown of shownCalls().map((item) => within(item))) {
      expect(shown.getByText("Call held")).toBeInTheDocument();
      expect(shown.queryByRole("link", { name: "Join call" })).toBeNull();
      expect(
        shown.getAllByRole("button").map((button) => button.textContent),
      ).toEqual(["Send payment link"]);
    }
  });

  it("gives no Call held badge to a call still to come", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    // assert
    for (const shown of shownCalls().map((item) => within(item))) {
      expect(shown.queryByText("Call held")).not.toBeInTheDocument();
      expect(
        shown.getByRole("link", { name: "Join call" }),
      ).toBeInTheDocument();
    }
  });

  it("points each join link at the booking's own room", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getAllByRole("link", { name: "Join call" })[0],
    ).toHaveAttribute("href", "/book/2026-09-20T15:00:00.000Z/join");
  });

  it("moves between the filters from the keyboard", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "All" }));
    await user.keyboard("{ArrowRight}");

    // assert
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: "Today", selected: true }),
      ).toBeInTheDocument();
    });
    expect(shownCallNames()).toEqual(["Ana Popescu", "Carla Marin"]);
  });

  it("puts the most recent past call first", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));

    // assert
    expect(shownCallNames()).toEqual(["Carla Marin", "Bea Ionescu"]);
  });

  it("narrows the list by name or address as she types", async () => {
    // arrange
    const user = await renderCallsPage();
    await user.click(screen.getByRole("tab", { name: "All" }));

    // act
    await user.type(screen.getByLabelText("Search calls"), "bea@");

    // assert
    await waitFor(() => {
      expect(shownCallNames()).toEqual(["Bea Ionescu"]);
    });
  });

  it("says when nothing matches the search", async () => {
    // arrange
    const user = await renderCallsPage();

    // act
    await user.type(screen.getByLabelText("Search calls"), "zzz");

    // assert
    await waitFor(() => {
      expect(screen.getByText("No calls found")).toBeInTheDocument();
    });
    expect(screen.getByText("No calls match your search.")).toBeInTheDocument();
  });

  it("clears a search that matches nothing and lists every call again", async () => {
    // arrange
    const { router, user } = await renderCallsRouter();
    await user.type(screen.getByLabelText("Search calls"), "zzz");

    // act
    await user.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(screen.getByLabelText("Search calls")).toHaveValue("");
    expect(shownCallNames()).toEqual([
      "Ana Popescu",
      "Dana Radu",
      "Carla Marin",
      "Bea Ionescu",
    ]);
  });

  it("keeps the filter and the search in the URL without stacking history", async () => {
    // arrange
    const { router, user } = await renderCallsRouter();

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));
    await user.type(screen.getByLabelText("Search calls"), "bea");

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?when=past&q=bea");
    });
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("keeps the default filter and an empty search out of the URL", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past`,
    });

    // act
    await user.click(screen.getByRole("tab", { name: "All" }));

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
  });

  it("restores the filter and the search a shared URL carries", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=all&q=carla`,
    });

    // assert
    expect(
      screen.getByRole("tab", { name: "All", selected: true }),
    ).toBeInTheDocument();
    expect(shownCallNames()).toEqual(["Carla Marin"]);
  });

  it("falls back to All for a window it does not recognise", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=nonsense`,
    });

    // assert
    expect(
      screen.getByRole("tab", { name: "All", selected: true }),
    ).toBeInTheDocument();
  });

  it("says nothing is coming up when no call is upcoming", async () => {
    // arrange
    const user = await renderCallsPage({ calls: [] });

    // act
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    // assert
    expect(screen.getByText("No calls found")).toBeInTheDocument();
    expect(screen.getByText("No upcoming calls.")).toBeInTheDocument();
  });

  it("offers Clear filters when the chosen window is empty and returns to All from it", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({ calls: [] });
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    // act
    await user.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(
      screen.getByRole("tab", { name: "All", selected: true }),
    ).toBeInTheDocument();
  });

  it("says nothing is on today when no call falls today", async () => {
    // arrange
    const user = await renderCallsPage({ calls: [] });

    // act
    await user.click(screen.getByRole("tab", { name: "Today" }));

    // assert
    expect(screen.getByText("No calls today.")).toBeInTheDocument();
  });

  it("says there is no history when no call has ended", async () => {
    // arrange
    const user = await renderCallsPage({ calls: [] });

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));

    // assert
    expect(screen.getByText("No past calls.")).toBeInTheDocument();
  });

  it("says no call has ever been booked when the whole list is empty", async () => {
    // arrange, act
    await renderCallsPage({ calls: [] });

    // assert
    expect(screen.getByText("No calls yet")).toBeInTheDocument();
    expect(
      screen.getByText("Booked assessment calls appear here."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("declines to re-read the calls when only the listing parameters change", async () => {
    // arrange
    const change = {
      currentUrl: new URL(`http://localhost${COACH_ASSESSMENT_CALLS_PATH}`),
      defaultShouldRevalidate: true,
      nextUrl: new URL(`http://localhost${COACH_ASSESSMENT_CALLS_PATH}?q=ana`),
    };

    // act, assert
    expect(shouldRevalidate(change as never)).toBe(false);
  });
});

describe("sorting the coach's assessment calls", () => {
  it("opens sorted by the scheduled date, soonest first", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      /^Scheduled date: soonest first$/,
    );
    expect(
      screen.getByRole("button", { name: "Soonest first" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("orders the calls by name from the sort select and keeps the choice in the URL", async () => {
    // arrange
    const { router, user } = await renderCallsRouter();

    // act
    await user.click(screen.getByRole("combobox", { name: "Sort by" }));
    await user.click(screen.getByRole("option", { name: "Name" }));

    // assert
    await waitFor(() => {
      expect(shownCallNames()).toEqual([
        "Ana Popescu",
        "Bea Ionescu",
        "Carla Marin",
        "Dana Radu",
      ]);
    });
    expect(router.state.location.search).toBe("?sort=name");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      /^Name: a to z$/,
    );
    expect(screen.getByRole("button", { name: "A to Z" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reverses the order from the direction toggle and says which way it now runs", async () => {
    // arrange
    const { router, user } = await renderCallsRouter();

    // act
    await user.click(screen.getByRole("button", { name: "Soonest first" }));

    // assert
    await waitFor(() => {
      expect(shownCallNames()).toEqual([
        "Bea Ionescu",
        "Carla Marin",
        "Dana Radu",
        "Ana Popescu",
      ]);
    });
    expect(router.state.location.search).toBe("?dir=asc");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      /^Scheduled date: latest first$/,
    );
    expect(
      screen.getByRole("button", { name: "Latest first" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the direction and returns to the first page when the key changes", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?sort=name&dir=desc&page=2`,
    });

    // act
    await user.click(screen.getByRole("combobox", { name: "Sort by" }));
    await user.click(screen.getByRole("option", { name: "Booking date" }));

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?sort=booked");
    });
    expect(
      screen.getByRole("button", { name: "Newest first" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("restores the sort a shared URL carries", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?sort=email&dir=desc`,
    });

    // assert
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      /^Email: z to a$/,
    );
    expect(screen.getByRole("button", { name: "Z to A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(shownCallNames()).toEqual([
      "Dana Radu",
      "Carla Marin",
      "Bea Ionescu",
      "Ana Popescu",
    ]);
  });

  it("sorts inside the active filter", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past&sort=name`,
    });

    // assert
    expect(shownCallNames()).toEqual(["Bea Ionescu", "Carla Marin"]);
  });
});

describe("paging through a long history of calls", () => {
  const thirtyCalls = Array.from({ length: 30 }, (_, index) =>
    call(new Date(NOW.getTime() + (index + 1) * 3_600_000).toISOString(), {
      id: `call-${index + 1}`,
      visitorEmail: `visitor${index + 1}@example.com`,
      ...visitorNamed(`Visitor ${index + 1}`),
    }),
  );

  it("shows ten at a time and says where in the run they sit", async () => {
    // arrange, act
    await renderCallsPage({ calls: thirtyCalls });

    // assert
    expect(shownCalls()).toHaveLength(10);
    expect(screen.getByText("Showing 1–10 of 30")).toBeInTheDocument();
  });

  it("opens on the page a shared URL names", async () => {
    // arrange, act
    await renderCallsPage({
      calls: thirtyCalls,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?page=2`,
    });

    // assert
    expect(shownCallNames()[0]).toBe("Visitor 11");
    expect(screen.getByText("Showing 11–20 of 30")).toBeInTheDocument();
  });

  it("clamps a page past the end of the run to the last one", async () => {
    // arrange, act
    await renderCallsPage({
      calls: thirtyCalls,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?page=99`,
    });

    // assert
    expect(screen.getByText("Showing 21–30 of 30")).toBeInTheDocument();
  });

  it("walks to the next page from its link", async () => {
    // arrange
    const user = await renderCallsPage({ calls: thirtyCalls });

    // act
    await user.click(screen.getByRole("link", { name: "Go to page 2" }));

    // assert
    await waitFor(() => {
      expect(screen.getByText("Showing 11–20 of 30")).toBeInTheDocument();
    });
  });

  it("returns to the first page when the search changes", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      calls: thirtyCalls,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?page=3`,
    });

    // act
    await user.type(screen.getByLabelText("Search calls"), "visitor1");

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?q=visitor1");
    });
  });

  it("leaves the pager out when everything fits on one page", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.queryByRole("navigation", { name: "pagination" }),
    ).not.toBeInTheDocument();
  });

  it("stops the step buttons at either end of the run", async () => {
    // arrange, act
    await renderCallsPage({ calls: thirtyCalls });

    // assert
    expect(
      screen.getByRole("button", { name: "Go to previous page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toBeInTheDocument();
  });
});

describe("where each ended call stands in the sale", () => {
  const SALE_UNDER_WAY: SalesStates = {
    "earlier-today": "payment-link-sent",
    yesterday: "paid",
  };

  it("badges each ended call with its sales state and a call still to come with none", async () => {
    // arrange, act
    await renderCallsPage({ salesStates: SALE_UNDER_WAY });

    // assert
    const [laterToday, nextWeek, earlierToday, yesterday] = shownCalls().map(
      (item) => within(item),
    );

    expect(earlierToday.getByText("Payment link sent")).toBeInTheDocument();
    expect(yesterday.getByText("Paid")).toBeInTheDocument();
    for (const upcoming of [laterToday, nextWeek]) {
      expect(upcoming.queryByText("Call held")).not.toBeInTheDocument();
      expect(upcoming.queryByText("Payment link sent")).not.toBeInTheDocument();
      expect(upcoming.queryByText("Paid")).not.toBeInTheDocument();
    }
  });

  it("offers a re-send once a link is out and nothing once the call is paid", async () => {
    // arrange, act
    await renderCallsPage({ salesStates: SALE_UNDER_WAY });

    // assert
    const [, , earlierToday, yesterday] = shownCalls().map((item) =>
      within(item),
    );

    expect(
      earlierToday.getByRole("button", { name: "Re-send payment link" }),
    ).toBeInTheDocument();
    expect(yesterday.queryByRole("button")).not.toBeInTheDocument();
  });

  it("counts every status under the window and search in view", async () => {
    // arrange
    const user = await renderCallsPage({
      salesStates: SALE_UNDER_WAY,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=today`,
    });

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));

    // assert
    expect(countedStatuses()).toEqual([
      ["All statuses", "2"],
      ["Call held", "0"],
      ["Payment link sent", "1"],
      ["Paid", "0"],
    ]);
  });

  it("opens on every status", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^All statuses$/,
    );
  });

  it("narrows the list to one status, back on the first page, and keeps it in the URL", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      salesStates: SALE_UNDER_WAY,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?page=2`,
    });

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "Paid" }));

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?status=paid");
    });
    expect(shownCallNames()).toEqual(["Bea Ionescu"]);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^Paid$/,
    );
  });

  it("keeps every status out of the URL", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=held`,
    });

    // act
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "All statuses" }));

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
  });

  it("restores the status a shared URL carries", async () => {
    // arrange, act
    await renderCallsPage({
      salesStates: SALE_UNDER_WAY,
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=payment-link-sent`,
    });

    // assert
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      /^Payment link sent$/,
    );
    expect(shownCallNames()).toEqual(["Carla Marin"]);
  });

  it("names the window and the status when nothing matches both", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past&status=paid`,
    });

    // assert
    expect(screen.getByText("No calls found")).toBeInTheDocument();
    expect(
      screen.getByText("No past calls match the Paid status."),
    ).toBeInTheDocument();
  });

  it("clears the window, the status, the search and the page but keeps the sort", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past&status=paid&q=bea&sort=name&page=2`,
    });

    // act
    await user.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?sort=name");
    });
    expect(shownCallNames()).toEqual([
      "Ana Popescu",
      "Bea Ionescu",
      "Carla Marin",
      "Dana Radu",
    ]);
  });

  it("sends a payment link and shows the call as sent once it is out", async () => {
    // arrange
    server.use(
      http.post(COACHING_SALES_API_PATHS.paymentLinks, () =>
        HttpResponse.json({ email: "bea@example.com", status: "sent" }),
      ),
    );
    const { loaded, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?when=past`,
    });
    const bea = within(shownCalls()[1]);
    await user.click(bea.getByRole("button", { name: "Send payment link" }));
    loaded.salesStates = {
      ...BOTH_ENDED_CALLS_HELD,
      yesterday: "payment-link-sent",
    };

    // act
    await user.click(screen.getByRole("button", { name: "Send link" }));

    // assert
    expect(
      await screen.findByText("Payment link sent to bea@example.com."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(shownCalls()[1]).getByText("Payment link sent"),
      ).toBeInTheDocument();
    });
  });
});

function countedStatuses(): [string, string][] {
  return ["All statuses", "Call held", "Payment link sent", "Paid"].map(
    (label) => {
      const option = screen.getByRole("option", { name: label });
      const countId = option.getAttribute("aria-describedby") ?? "";

      return [label, document.getElementById(countId)?.textContent ?? ""];
    },
  );
}

describe("the coach assessment calls page when the calls cannot be read", () => {
  it("replaces the listing with the unavailable dead end", async () => {
    // arrange
    const router = createMemoryRouter(
      [
        {
          Component: CoachAssessmentCallsRoute,
          ErrorBoundary: CoachAssessmentCallsErrorBoundary,
          loader: () => {
            throw new Response("unavailable", { status: 503 });
          },
          path: COACH_ASSESSMENT_CALLS_PATH,
        },
      ],
      { initialEntries: [COACH_ASSESSMENT_CALLS_PATH] },
    );

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Assessment calls unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your assessment calls could not be loaded. Try again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

function shownCalls(): HTMLElement[] {
  return within(
    screen.getByRole("list", { name: "Assessment calls" }),
  ).getAllByRole("listitem");
}

function shownCallNames(): string[] {
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "");
}

type CallsPageOptions = {
  calls?: CoachAssessmentCall[];
  salesStates?: SalesStates;
  url?: string;
};

async function renderCallsRouter(options?: CallsPageOptions) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const loaded = {
    calls: options?.calls ?? FOUR_CALLS,
    salesStates: options?.salesStates ?? BOTH_ENDED_CALLS_HELD,
  };
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <>
            <Outlet />
            <Toaster />
          </>
        ),
        children: [
          {
            Component: CoachAssessmentCallsRoute,
            loader: () => ({
              calls: loaded.calls,
              coachTimeZone: COACH_TIME_ZONE,
              now: NOW.toISOString(),
              salesStates: loaded.salesStates,
            }),
            path: COACH_ASSESSMENT_CALLS_PATH,
            shouldRevalidate,
          },
        ],
      },
      {
        action: ({ request }: { request: Request }) => fetch(request),
        path: COACHING_SALES_API_PATHS.paymentLinks,
      },
    ],
    { initialEntries: [options?.url ?? COACH_ASSESSMENT_CALLS_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Assessment calls" });

  return { loaded, router, user };
}

async function renderCallsPage(options?: CallsPageOptions): Promise<UserEvent> {
  const { user } = await renderCallsRouter(options);

  return user;
}
