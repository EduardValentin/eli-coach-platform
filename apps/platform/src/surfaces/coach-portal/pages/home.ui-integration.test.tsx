// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CoachAssessmentCall,
  CoachAssessmentCalls,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";
import { COACH_PORTAL_PATH } from "~/features/accounts/contracts/paths";

import CoachHomeRoute from "./home";

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

const ENDED_TODAY = call("2026-09-20T05:00:00.000Z", {
  id: "ended-today",
  visitorName: "Carla Marin",
});
const LATER_TODAY = call("2026-09-20T15:00:00.000Z", { id: "later-today" });
const TOMORROW = call("2026-09-21T15:00:00.000Z", {
  id: "tomorrow",
  visitorName: "Dana Radu",
});
const NEXT_WEEK = call("2026-09-22T15:00:00.000Z", {
  id: "next-week",
  visitorName: "Elena Vasile",
});
const LATER_STILL = call("2026-09-23T15:00:00.000Z", {
  id: "later-still",
  visitorName: "Flora Anton",
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("the coach's dashboard", () => {
  it("greets her and counts the calls starting today", async () => {
    // arrange, act
    await renderDashboard([ENDED_TODAY, LATER_TODAY, TOMORROW]);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Coach." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You have 2 assessment calls today."),
    ).toBeInTheDocument();
  });

  it("says one call in the singular", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY, TOMORROW]);

    // assert
    expect(
      screen.getByText("You have 1 assessment call today."),
    ).toBeInTheDocument();
  });

  it("says nothing is on today in the plural", async () => {
    // arrange, act
    await renderDashboard([TOMORROW]);

    // assert
    expect(
      screen.getByText("You have 0 assessment calls today."),
    ).toBeInTheDocument();
  });

  it("lists the next three calls that have not ended, soonest first", async () => {
    // arrange, act
    await renderDashboard([
      LATER_STILL,
      LATER_TODAY,
      NEXT_WEEK,
      TOMORROW,
      ENDED_TODAY,
    ]);

    // assert
    const widget = within(screen.getByRole("list"));
    const rows = widget.getAllByRole("listitem");

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Ana Popescu"),
      expect.stringContaining("Dana Radu"),
      expect.stringContaining("Elena Vasile"),
    ]);
  });

  it("states each call's day and time and badges the ones falling today", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY, TOMORROW]);

    // assert
    const rows = screen.getAllByRole("listitem");

    expect(within(rows[0]).getByText("Today")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Sun, Sep 20 at 6:00 PM");
    expect(within(rows[1]).queryByText("Today")).not.toBeInTheDocument();
  });

  it("points each join link at the booking's own room", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY]);

    // assert
    expect(screen.getByRole("link", { name: "Join call" })).toHaveAttribute(
      "href",
      "/book/2026-09-20T15:00:00.000Z/join",
    );
  });

  it("says so when no call is coming, and still offers the whole list", async () => {
    // arrange, act
    await renderDashboard([ENDED_TODAY]);

    // assert
    expect(screen.getByText("No upcoming calls.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View all calls/ }),
    ).toHaveAttribute("href", COACH_ASSESSMENT_CALLS_PATH);
  });

  it("heads the widget so the dashboard reads as one outline", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY]);

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Upcoming calls" }),
    ).toBeInTheDocument();
  });

  it("re-reads today in the browser's zone once it has mounted", async () => {
    // arrange
    vi.stubEnv("TZ", KIRITIMATI);

    // act
    await renderDashboard([LATER_TODAY]);

    // assert — the Bucharest evening is already tomorrow on Kiritimati.
    await waitFor(() => {
      expect(
        screen.getByText("You have 0 assessment calls today."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});

async function renderDashboard(calls: CoachAssessmentCall[]) {
  const listing: CoachAssessmentCalls = {
    calls,
    coachTimeZone: COACH_TIME_ZONE,
    now: NOW.toISOString(),
  };
  const router = createMemoryRouter(
    [
      {
        Component: CoachHomeRoute,
        loader: () => listing,
        path: COACH_PORTAL_PATH,
      },
    ],
    { initialEntries: [COACH_PORTAL_PATH] },
  );

  const rendered = render(<RouterProvider router={router} />);
  await screen.findByRole("heading", {
    level: 1,
    name: "Good morning, Coach.",
  });

  return rendered;
}
