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
import type { UserEvent } from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CoachAssessmentCall,
  CoachAssessmentCalls,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";

import CoachAssessmentCallsRoute, {
  ErrorBoundary as CoachAssessmentCallsErrorBoundary,
  shouldRevalidate,
} from "./assessment-calls-page";

const COACH_TIME_ZONE = "Europe/Bucharest";
const KIRITIMATI = "Pacific/Kiritimati";
const NOW = new Date("2026-09-20T09:00:00.000Z");
const CALL_MINUTES = 30;

function call(
  startsAt: string,
  overrides: Partial<CoachAssessmentCall> = {},
): CoachAssessmentCall {
  const starts = new Date(startsAt);

  return {
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("TZ", COACH_TIME_ZONE);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("the coach's assessment calls page", () => {
  it("heads the page", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Assessment calls" }),
    ).toBeInTheDocument();
  });

  it("names no time zone, because every time is the reader's own", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(screen.queryByText(/Times in /)).not.toBeInTheDocument();
  });

  it("opens on the calls that have not ended, soonest first", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getByRole("tab", { name: "Upcoming", selected: true }),
    ).toBeInTheDocument();
    expect(shownCallNames()).toEqual(["Ana Popescu", "Dana Radu"]);
  });

  it("gives each call its attendee, its moment, its address and its notes", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    const soonest = within(shownCalls()[0]);

    expect(soonest.getByText("Sun, Sep 20")).toBeInTheDocument();
    expect(soonest.getByText("6:00 PM")).toBeInTheDocument();
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
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=all`,
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
    await renderCallsPage();

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
    expect(screen.getAllByText("Past").length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));
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
      expect(
        screen.getByText("No calls match your search."),
      ).toBeInTheDocument();
    });
  });

  it("keeps the filter and the search in the URL without stacking history", async () => {
    // arrange
    const { router, user } = await renderCallsRouter();

    // act
    await user.click(screen.getByRole("tab", { name: "Past" }));
    await user.type(screen.getByLabelText("Search calls"), "bea");

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("?status=past&q=bea");
    });
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("keeps the default filter and an empty search out of the URL", async () => {
    // arrange
    const { router, user } = await renderCallsRouter({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=past`,
    });

    // act
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    // assert
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
  });

  it("restores the filter and the search a shared URL carries", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=all&q=carla`,
    });

    // assert
    expect(
      screen.getByRole("tab", { name: "All", selected: true }),
    ).toBeInTheDocument();
    expect(shownCallNames()).toEqual(["Carla Marin"]);
  });

  it("falls back to Upcoming for a filter it does not recognise", async () => {
    // arrange, act
    await renderCallsPage({
      url: `${COACH_ASSESSMENT_CALLS_PATH}?status=nonsense`,
    });

    // assert
    expect(
      screen.getByRole("tab", { name: "Upcoming", selected: true }),
    ).toBeInTheDocument();
  });

  it("says nothing is coming up when no call is upcoming", async () => {
    // arrange, act
    await renderCallsPage({ calls: [] });

    // assert
    expect(screen.getByText("No upcoming calls.")).toBeInTheDocument();
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
    // arrange
    const user = await renderCallsPage({ calls: [] });

    // act
    await user.click(screen.getByRole("tab", { name: "All" }));

    // assert
    expect(screen.getByText("No calls yet.")).toBeInTheDocument();
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

async function renderCallsRouter(options?: {
  calls?: CoachAssessmentCall[];
  url?: string;
}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const listing: CoachAssessmentCalls = {
    calls: options?.calls ?? FOUR_CALLS,
    coachTimeZone: COACH_TIME_ZONE,
    now: NOW.toISOString(),
  };
  const router = createMemoryRouter(
    [
      {
        Component: CoachAssessmentCallsRoute,
        loader: () => listing,
        path: COACH_ASSESSMENT_CALLS_PATH,
        shouldRevalidate,
      },
    ],
    { initialEntries: [options?.url ?? COACH_ASSESSMENT_CALLS_PATH] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Assessment calls" });

  return { router, user };
}

async function renderCallsPage(options?: {
  calls?: CoachAssessmentCall[];
  url?: string;
}): Promise<UserEvent> {
  const { user } = await renderCallsRouter(options);

  return user;
}
