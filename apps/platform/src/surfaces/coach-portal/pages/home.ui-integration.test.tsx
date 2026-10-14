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
import { configureAxe } from "vitest-axe";

import type {
  CoachAssessmentCall,
  CoachAssessmentCalls,
} from "~/features/assessment-calls/public/assessment-calls";
import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/public/paths";
import { COACH_PORTAL_PATH } from "~/features/accounts/public/paths";
import type { CoachCheckIn } from "~/features/check-ins/public/check-ins";
import {
  COACH_CHECK_INS_PATH,
  coachCheckInPath,
} from "~/features/check-ins/public/paths";

import CoachHomeRoute, {
  ErrorBoundary as CoachHomeErrorBoundary,
} from "./home";

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

const ENDED_TODAY = call("2026-09-20T05:00:00.000Z", {
  id: "ended-today",
  ...visitorNamed("Carla Marin"),
});
const LATER_TODAY = call("2026-09-20T15:00:00.000Z", { id: "later-today" });
const ALSO_LATER_TODAY = call("2026-09-20T17:00:00.000Z", {
  id: "also-later-today",
  ...visitorNamed("Gina Toma"),
});
const TOMORROW = call("2026-09-21T15:00:00.000Z", {
  id: "tomorrow",
  ...visitorNamed("Dana Radu"),
});
const NEXT_WEEK = call("2026-09-22T15:00:00.000Z", {
  id: "next-week",
  ...visitorNamed("Elena Vasile"),
});
const LATER_STILL = call("2026-09-23T15:00:00.000Z", {
  id: "later-still",
  ...visitorNamed("Flora Anton"),
});

function pendingCheckIn(
  id: string,
  startsAt: string,
  client: CoachCheckIn["client"],
): CoachCheckIn {
  const starts = new Date(startsAt);

  return {
    id,
    kind: "ad_hoc",
    status: "pending",
    initiatedBy: "client",
    proposedBy: "client",
    awaitsViewer: true,
    viewerMayWithdraw: false,
    viewerProposal: "allowed",
    viewerMayCancel: false,
    newTimeWaits: false,
    isWaitingRequest: true,
    startsAt: starts.toISOString(),
    endsAt: new Date(starts.getTime() + 60 * 60_000).toISOString(),
    joinEmphasisFrom: new Date(starts.getTime() - 10 * 60_000).toISOString(),
    earlierStartsAt: null,
    moves: 0,
    note: null,
    newTimeNote: null,
    clientId: "6a7b8c9d-0e1f-4a2b-8c3d-5e6f7a8b9c0d",
    client,
  };
}

const MARIA_TOMORROW = pendingCheckIn(
  "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  "2026-09-21T12:00:00.000Z",
  { firstName: "Maria", lastName: "Popescu" },
);
const ANDREEA_IN_TWO_DAYS = pendingCheckIn(
  "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  "2026-09-22T09:00:00.000Z",
  { firstName: "Andreea", lastName: "Ionescu" },
);
const ELENA_IN_THREE_DAYS = pendingCheckIn(
  "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  "2026-09-23T07:00:00.000Z",
  { firstName: "Elena", lastName: "Dumitru" },
);
const IOANA_NEXT_WEEK = pendingCheckIn(
  "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f7a",
  "2026-09-28T12:00:00.000Z",
  { firstName: "Ioana", lastName: "Stan" },
);

const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

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

describe("the coach's dashboard", () => {
  it("greets her and counts the calls she has left today", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY, ALSO_LATER_TODAY, TOMORROW]);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Eli." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You have 2 assessment calls today."),
    ).toBeInTheDocument();
  });

  it("stops counting a call once it has ended", async () => {
    // arrange, act
    await renderDashboard([ENDED_TODAY, TOMORROW]);

    // assert
    expect(
      screen.getByText("You have 0 assessment calls today."),
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
    const widget = within(
      within(
        screen.getByRole("region", { name: "Upcoming assessment calls" }),
      ).getByRole("list"),
    );
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
    const rows = within(
      screen.getByRole("region", { name: "Upcoming assessment calls" }),
    ).getAllByRole("listitem");

    expect(within(rows[0]).getByText("Today")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Sun, Sep 20")).toBeInTheDocument();
    expect(within(rows[0]).getByText("· 6:00 PM")).toBeInTheDocument();
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
      screen.getByRole("heading", {
        level: 2,
        name: "Upcoming assessment calls",
      }),
    ).toBeInTheDocument();
  });

  it("frames the upcoming calls as a region named by the widget heading", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY]);

    // assert
    const region = screen.getByRole("region", {
      name: "Upcoming assessment calls",
    });

    expect(
      within(region).getByRole("link", { name: "Join call" }),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: /View all calls/ }),
    ).toHaveAttribute("href", COACH_ASSESSMENT_CALLS_PATH);
  });

  it("re-reads today in the browser's zone, where the Bucharest evening is already tomorrow", async () => {
    // arrange
    vi.stubEnv("TZ", KIRITIMATI);

    // act
    await renderDashboard([LATER_TODAY]);

    // assert
    await waitFor(() => {
      expect(
        screen.getByText("You have 0 assessment calls today."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});

describe("the coach's check-ins on her dashboard", () => {
  it("counts the check-ins waiting for her answer after the calls line", async () => {
    // arrange, act
    await renderDashboard(
      [LATER_TODAY],
      [
        MARIA_TOMORROW,
        ANDREEA_IN_TWO_DAYS,
        ELENA_IN_THREE_DAYS,
        IOANA_NEXT_WEEK,
      ],
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Eli." })
        .nextElementSibling,
    ).toHaveTextContent(
      "You have 1 assessment call today. 4 check-ins to review.",
    );
    expect(screen.getByText("4 check-ins to review.")).toBeInTheDocument();
  });

  it("says one check-in in the singular", async () => {
    // arrange, act
    await renderDashboard([], [MARIA_TOMORROW]);

    // assert
    expect(screen.getByText("1 check-in to review.")).toBeInTheDocument();
  });

  it("says nothing waits for her in the plural", async () => {
    // arrange, act
    await renderDashboard([], []);

    // assert
    expect(screen.getByText("0 check-ins to review.")).toBeInTheDocument();
  });

  it("lists the first three it is given, soonest first, each naming the client with its day and time", async () => {
    // arrange, act
    await renderDashboard(
      [],
      [
        MARIA_TOMORROW,
        ANDREEA_IN_TWO_DAYS,
        ELENA_IN_THREE_DAYS,
        IOANA_NEXT_WEEK,
      ],
    );

    // assert
    const rows = within(
      screen.getByRole("region", { name: "Pending Check-ins" }),
    ).getAllByRole("listitem");

    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Maria Popescu"),
      expect.stringContaining("Andreea Ionescu"),
      expect.stringContaining("Elena Dumitru"),
    ]);
    expect(within(rows[0]).getByText("Mon, Sep 21")).toBeInTheDocument();
    expect(within(rows[0]).getByText("· 3:00 PM")).toBeInTheDocument();
  });

  it("points each Review link at that check-in on the check-ins page", async () => {
    // arrange, act
    await renderDashboard([], [MARIA_TOMORROW, ANDREEA_IN_TWO_DAYS]);

    // assert
    const region = screen.getByRole("region", { name: "Pending Check-ins" });

    expect(
      within(region)
        .getAllByRole("link", { name: "Review" })
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      coachCheckInPath(MARIA_TOMORROW.id),
      coachCheckInPath(ANDREEA_IN_TWO_DAYS.id),
    ]);
  });

  it("says so when nothing waits for her, still offers every check-in, and keeps the calls beside it", async () => {
    // arrange, act
    await renderDashboard([LATER_TODAY], []);

    // assert
    const region = screen.getByRole("region", { name: "Pending Check-ins" });

    expect(
      within(region).getByText("No pending check-ins."),
    ).toBeInTheDocument();
    expect(within(region).queryByRole("list")).not.toBeInTheDocument();
    expect(
      within(region).getByRole("link", { name: /View all check-ins/ }),
    ).toHaveAttribute("href", COACH_CHECK_INS_PATH);
    expect(
      within(
        screen.getByRole("region", { name: "Upcoming assessment calls" }),
      ).getByRole("link", { name: "Join call" }),
    ).toBeInTheDocument();
  });

  it("passes the axe checks with calls and check-ins listed", async () => {
    // arrange, act
    const { baseElement } = await renderDashboard(
      [LATER_TODAY, TOMORROW],
      [MARIA_TOMORROW, ANDREEA_IN_TWO_DAYS],
    );

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

describe("the coach's dashboard when the calls cannot be read", () => {
  it("replaces the dashboard with the unavailable dead end", async () => {
    // arrange
    const router = createMemoryRouter(
      [
        {
          Component: CoachHomeRoute,
          ErrorBoundary: CoachHomeErrorBoundary,
          loader: () => {
            throw new Response("unavailable", { status: 503 });
          },
          path: COACH_PORTAL_PATH,
        },
      ],
      { initialEntries: [COACH_PORTAL_PATH] },
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
    expect(
      screen.queryByRole("heading", { name: "Upcoming assessment calls" }),
    ).not.toBeInTheDocument();
  });
});

async function renderDashboard(
  calls: CoachAssessmentCall[],
  pendingCheckIns: CoachCheckIn[] = [],
) {
  const listing: CoachAssessmentCalls = {
    calls,
    coachTimeZone: COACH_TIME_ZONE,
    now: NOW.toISOString(),
  };
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Coach portal content">
            <CoachHomeRoute />
          </main>
        ),
        loader: () => ({
          listing,
          pendingCheckIns: { checkIns: pendingCheckIns },
        }),
        path: COACH_PORTAL_PATH,
      },
    ],
    { initialEntries: [COACH_PORTAL_PATH] },
  );

  const rendered = render(<RouterProvider router={router} />);
  await screen.findByRole("heading", {
    level: 1,
    name: "Good morning, Eli.",
  });

  return rendered;
}
