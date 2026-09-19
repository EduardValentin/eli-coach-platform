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
    visitorName: "Ana Popescu",
    visitorNotes: null,
    ...overrides,
  };
}

const YESTERDAY = call("2026-09-19T15:00:00.000Z", {
  id: "yesterday",
  visitorEmail: "bea@example.com",
  visitorName: "Bea Ionescu",
});
const EARLIER_TODAY = call("2026-09-20T05:00:00.000Z", {
  id: "earlier-today",
  visitorEmail: "carla@example.com",
  visitorName: "Carla Marin",
});
const LATER_TODAY = call("2026-09-20T15:00:00.000Z", {
  id: "later-today",
  visitorNotes: "Wants to talk about\nher glute programme",
});
const NEXT_WEEK = call("2026-09-22T15:00:00.000Z", {
  id: "next-week",
  visitorEmail: "dana@example.com",
  visitorName: "Dana Radu",
});

const FOUR_CALLS = [YESTERDAY, EARLIER_TODAY, LATER_TODAY, NEXT_WEEK];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("the coach's assessment calls page", () => {
  it("heads the page and names the zone its times are in", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Assessment calls" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Times in ${COACH_TIME_ZONE}, GMT+3`),
    ).toBeInTheDocument();
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

  it("badges the calls that fall today in the reader's own zone", async () => {
    // arrange, act
    await renderCallsPage();

    // assert
    const calls = shownCalls();

    expect(within(calls[0]).getByText("Today")).toBeInTheDocument();
    expect(within(calls[1]).queryByText("Today")).not.toBeInTheDocument();
  });

  it("reads the day and today from the browser's zone, not the coach's", async () => {
    // arrange — the Bucharest evening has already become tomorrow on Kiritimati.
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

  it("says so for each filter that has nothing to show", async () => {
    // arrange
    const user = await renderCallsPage({ calls: [] });

    // assert
    expect(screen.getByText("No upcoming calls.")).toBeInTheDocument();

    // act, assert
    await user.click(screen.getByRole("tab", { name: "Today" }));
    expect(screen.getByText("No calls today.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Past" }));
    expect(screen.getByText("No past calls.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All" }));
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
      visitorName: `Visitor ${index + 1}`,
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
