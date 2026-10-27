// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "~/shared/design-system/toast";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
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
import { configureAxe } from "vitest-axe";

import {
  clientLoader as openTimesLoader,
  shouldRevalidate as shouldRevalidateOpenTimes,
} from "~/bounded-contexts/clients/check-ins/api/shared/open-times";
import { clientAction as requestCheckIn } from "~/bounded-contexts/clients/check-ins/api/client/requests";
import { clientAction as approveCheckIn } from "~/bounded-contexts/clients/check-ins/api/shared/approval";
import { clientAction as cancelCheckIn } from "~/bounded-contexts/clients/check-ins/api/shared/cancellation";
import { clientAction as declineCheckIn } from "~/bounded-contexts/clients/check-ins/api/shared/decline";
import { clientAction as proposeNewTime } from "~/bounded-contexts/clients/check-ins/api/shared/new-time";
import { clientAction as withdrawCheckIn } from "~/bounded-contexts/clients/check-ins/api/shared/withdrawal";
import type { ClientCheckIns } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import {
  CHECK_INS_API_PATHS,
  CLIENT_CHECK_INS_PATH,
  clientCheckInPath,
} from "~/bounded-contexts/clients/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/composition-root/test-support/framework-mode-action";

import ClientCheckInsRoute, { shouldRevalidate } from "./check-ins-page";

type ClientCheckIn = ClientCheckIns["checkIns"][number];

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";

const APPROVED_SOON: ClientCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  seriesId: null,
  kind: "ad_hoc",
  status: "approved",
  tab: "upcoming",
  initiatedBy: "client",
  proposedBy: "client",
  awaitsViewer: false,
  viewerMayWithdraw: false,
  viewerProposal: "allowed",
  viewerMayCancel: true,
  newTimeWaits: false,
  isWaitingRequest: false,
  startsAt: "2026-10-14T07:00:00.000Z",
  endsAt: "2026-10-14T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T06:50:00.000Z",
  earlierStartsAt: null,
  moves: 0,
  note: null,
  newTimeNote: null,
};

const APPROVED_LATER: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  startsAt: "2026-10-20T07:00:00.000Z",
  endsAt: "2026-10-20T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-20T06:50:00.000Z",
};

const WAITING_REQUEST: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  status: "pending",
  tab: "requests",
  viewerMayWithdraw: true,
  isWaitingRequest: true,
  startsAt: "2026-10-16T09:00:00.000Z",
  endsAt: "2026-10-16T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T08:50:00.000Z",
  note: "Can we look at my squat form?",
};

const COACH_REQUEST: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b9c",
  status: "pending",
  tab: "requests",
  initiatedBy: "coach",
  proposedBy: "coach",
  awaitsViewer: true,
  startsAt: "2026-10-19T09:00:00.000Z",
  endsAt: "2026-10-19T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-19T08:50:00.000Z",
  note: "Let's look at your first two weeks",
};

const COACH_REQUEST_APPROVED: ClientCheckIn = {
  ...COACH_REQUEST,
  status: "approved",
  tab: "upcoming",
  awaitsViewer: false,
  viewerMayCancel: false,
};

const PASSED: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f7a",
  status: "passed",
  tab: "past",
  viewerProposal: "none",
  viewerMayCancel: false,
  startsAt: "2026-10-05T07:00:00.000Z",
  endsAt: "2026-10-05T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-05T06:50:00.000Z",
};

const CANCELLED: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a8b",
  status: "cancelled",
  tab: "past",
  viewerProposal: "none",
  viewerMayCancel: false,
  startsAt: "2026-10-08T13:00:00.000Z",
  endsAt: "2026-10-08T14:00:00.000Z",
  joinEmphasisFrom: "2026-10-08T12:50:00.000Z",
  note: "Wanted to talk through travel week",
};

const COACH_NEW_TIME: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "6a7b8c9d-0e1f-4a2b-9c3d-5e6f7a8b9c0d",
  status: "pending",
  tab: "requests",
  proposedBy: "coach",
  awaitsViewer: true,
  viewerMayCancel: false,
  newTimeWaits: true,
  startsAt: "2026-10-15T11:00:00.000Z",
  endsAt: "2026-10-15T12:00:00.000Z",
  joinEmphasisFrom: "2026-10-15T10:50:00.000Z",
  earlierStartsAt: "2026-10-14T07:00:00.000Z",
  moves: 1,
  note: "Want to go over my food log",
  newTimeNote:
    "I am travelling that Wednesday. Could we do Thursday at 2 PM instead?",
};

const COACH_NEW_TIME_ACCEPTED: ClientCheckIn = {
  ...COACH_NEW_TIME,
  status: "approved",
  tab: "upcoming",
  awaitsViewer: false,
  viewerMayCancel: true,
  newTimeWaits: false,
};

const OWN_NEW_TIME: ClientCheckIn = {
  ...COACH_NEW_TIME,
  id: "7b8c9d0e-1f2a-4b3c-8d4e-6f7a8b9c0d1e",
  initiatedBy: "coach",
  proposedBy: "client",
  awaitsViewer: false,
  viewerProposal: "none",
  startsAt: "2026-10-16T13:00:00.000Z",
  endsAt: "2026-10-16T14:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T12:50:00.000Z",
  earlierStartsAt: "2026-10-16T07:00:00.000Z",
  note: "Time to look back at your first month",
  newTimeNote:
    "I have a work call that morning. Could we meet on Friday afternoon?",
};

const RESCHEDULED: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "8c9d0e1f-2a3b-4c4d-9e5f-7a8b9c0d1e2f",
  proposedBy: "coach",
  startsAt: "2026-10-16T09:00:00.000Z",
  endsAt: "2026-10-16T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T08:50:00.000Z",
  earlierStartsAt: "2026-10-15T08:00:00.000Z",
  moves: 1,
  note: "Want to go over my food log",
};

const MOVED_TWICE: ClientCheckIn = {
  ...RESCHEDULED,
  id: "9d0e1f2a-3b4c-4d5e-8f6a-8b9c0d1e2f3a",
  proposedBy: "client",
  viewerProposal: "exhausted",
  startsAt: "2026-10-22T13:00:00.000Z",
  endsAt: "2026-10-22T14:00:00.000Z",
  joinEmphasisFrom: "2026-10-22T12:50:00.000Z",
  earlierStartsAt: "2026-10-20T12:00:00.000Z",
  moves: 2,
  note: "Can we plan my holiday training?",
  newTimeNote: "Thursday afternoon suits me better.",
};

const WEEKLY_SERIES_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const NEXT_WEEKLY: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  seriesId: WEEKLY_SERIES_ID,
  kind: "recurring",
  initiatedBy: "coach",
  proposedBy: "coach",
  viewerMayCancel: false,
  startsAt: "2026-10-21T15:00:00.000Z",
  endsAt: "2026-10-21T16:00:00.000Z",
  joinEmphasisFrom: "2026-10-21T14:50:00.000Z",
};

const NEXT_WEEKLY_CLASH: ClientCheckIn = {
  ...NEXT_WEEKLY,
  status: "clash",
  viewerProposal: "none",
};

const LATER_WEEKLY: ClientCheckIn = {
  ...NEXT_WEEKLY,
  id: "c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f",
  viewerProposal: "later_week",
  startsAt: "2026-10-28T16:00:00.000Z",
  endsAt: "2026-10-28T17:00:00.000Z",
  joinEmphasisFrom: "2026-10-28T15:50:00.000Z",
};

const LAST_WEEKLY: ClientCheckIn = {
  ...LATER_WEEKLY,
  id: "d4e5f6a7-b8c9-4d0e-9f1a-3b4c5d6e7f8a",
  startsAt: "2026-11-04T16:00:00.000Z",
  endsAt: "2026-11-04T17:00:00.000Z",
  joinEmphasisFrom: "2026-11-04T15:50:00.000Z",
};

const ELEVEN_UPCOMING: ClientCheckIn[] = Array.from(
  { length: 11 },
  (_, index) => {
    const day = String(14 + index).padStart(2, "0");

    return {
      ...APPROVED_SOON,
      id: `c1c1c1c1-0000-4000-8000-0000000000${String(index).padStart(2, "0")}`,
      startsAt: `2026-10-${day}T07:00:00.000Z`,
      endsAt: `2026-10-${day}T08:00:00.000Z`,
      joinEmphasisFrom: `2026-10-${day}T06:50:00.000Z`,
    };
  },
);

const ELEVENTH_UPCOMING = ELEVEN_UPCOMING[10];

const SHOWN_DAY = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}/;

const NEXT_WEEKLY_MENU =
  "More actions for the check-in on Wed, Oct 21 at 6:00 PM";
const LATER_WEEKLY_MENU =
  "More actions for the check-in on Wed, Oct 28 at 6:00 PM";
const LAST_WEEKLY_MENU =
  "More actions for the check-in on Wed, Nov 4 at 6:00 PM";
const LATER_WEEK_REASON =
  "You can move only your next weekly check-in; your coach can move the later ones.";
const COACH_REQUEST_APPROVED_MENU =
  "More actions for the check-in on Mon, Oct 19 at 12:00 PM";

const THURSDAY_AFTERNOON = "2026-10-15T14:00:00.000Z";
const THURSDAY_EVENING = "2026-10-15T15:00:00.000Z";
const FRIDAY_AFTERNOON = "2026-10-16T14:00:00.000Z";
const OPEN_TIMES = [THURSDAY_AFTERNOON, THURSDAY_EVENING, FRIDAY_AFTERNOON];

const WAITING_REASON =
  "You can send another request once this one is answered.";

const MOVED_TWICE_REASON = "This check-in has already been moved twice.";

const SOON_MENU = "More actions for the check-in on Wed, Oct 14 at 10:00 AM";
const COACH_NEW_TIME_MENU =
  "More actions for the check-in on Thu, Oct 15 at 2:00 PM";
const MOVED_TWICE_MENU =
  "More actions for the check-in on Thu, Oct 22 at 4:00 PM";

const OPEN_TIMES_URL = `*${CHECK_INS_API_PATHS.openTimes}`;
const REQUESTS_URL = `*${CHECK_INS_API_PATHS.requests}`;
const WITHDRAWAL_URL = `*${CHECK_INS_API_PATHS.withdrawal}`;
const APPROVAL_URL = `*${CHECK_INS_API_PATHS.approval}`;
const DECLINE_URL = `*${CHECK_INS_API_PATHS.decline}`;
const CANCELLATION_URL = `*${CHECK_INS_API_PATHS.cancellation}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });
const axeWithMenuOpen = configureAxe({
  rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
});

let listing: ClientCheckIns;
let listingReads = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("TZ", TIME_ZONE);
  listing = { checkIns: [APPROVED_LATER, APPROVED_SOON, PASSED, CANCELLED] };
  listingReads = 0;
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("the client's check-ins page", () => {
  it("heads the page and opens on her upcoming check-ins, soonest first, each with her coach and a way to join", async () => {
    // arrange, act
    await renderCheckInsPage();

    // assert
    expect(
      screen
        .getAllByRole("heading", { level: 1 })
        .map(({ textContent }) => textContent),
    ).toEqual(["Check-ins"]);
    expect(
      screen.getByText(
        "Request a check-in, answer proposals, and look back at past sessions.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const rows = within(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Wed, Oct 14");
    expect(rows[0]).toHaveTextContent("· 10:00 AM");
    expect(rows[0]).toHaveTextContent("Ad-hoc · Requested by you");
    expect(rows[1]).toHaveTextContent("Tue, Oct 20");
    expect(within(rows[0]).getByText("Eli")).toBeInTheDocument();
    expect(rows[0].querySelector("img")).toHaveAttribute(
      "src",
      "/media/eli/eli-portrait-192.webp",
    );
    expect(
      within(rows[0]).getByRole("link", { name: "Join Meet" }),
    ).toHaveAttribute("href", `/client/checkins/${APPROVED_SOON.id}/join`);
  });

  it("shows her waiting request under Requests with her note and a way to cancel it", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, "Requests");

    // assert
    const row = within(
      await screen.findByRole("list", { name: "Requests check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent('You: "Can we look at my squat form?"');
    expect(
      within(row).getByRole("button", { name: "Cancel request" }),
    ).toBeEnabled();
    expect(
      within(row).queryByRole("link", { name: "Join Meet" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("tab", { name: "Requests" })).queryByText("1"),
    ).not.toBeInTheDocument();
  });

  it("lists her past check-ins latest first, dimmed, with the cancelled one marked and no actions", async () => {
    // arrange
    const user = await renderCheckInsPage();

    // act
    await showTab(user, "Past");

    // assert
    const rows = within(
      await screen.findByRole("list", { name: "Past check-ins" }),
    ).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Thu, Oct 8"),
      expect.stringContaining("Mon, Oct 5"),
    ]);
    expect(within(rows[0]).getByText("Cancelled")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent(
      'You: "Wanted to talk through travel week"',
    );
    expect(within(rows[1]).queryByText("Cancelled")).not.toBeInTheDocument();
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rows[0]).queryByRole("link")).not.toBeInTheDocument();
  });

  it.each([
    [
      "Upcoming",
      "No upcoming check-ins",
      "Request one any time using the button above.",
    ],
    [
      "Requests",
      "No open requests",
      "Requests you send and proposals from your coach show up here.",
    ],
    [
      "Past",
      "No past check-ins yet",
      "Passed and cancelled check-ins will appear here.",
    ],
  ])("tells her when %s holds nothing", async (tab, title, description) => {
    // arrange
    listing = { checkIns: [] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, tab);

    // assert
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("emphasises Join Meet once the check-in is about to start and calms it again when it ends", async () => {
    // arrange
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-14T06:49:30.000Z"));
    listing = { checkIns: [APPROVED_SOON] };
    await renderCheckInsPage();
    const join = screen.getByRole("link", { name: "Join Meet" });
    const before = join.className;

    // act
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    const during = join.className;
    act(() => {
      vi.advanceTimersByTime(70 * 60 * 1000);
    });

    // assert
    expect(before).not.toContain("bg-primary");
    expect(during).toContain("bg-primary");
    expect(join).not.toHaveClass("bg-primary");
  });

  it("passes the axe checks with her check-ins listed", async () => {
    // arrange, act
    const { baseElement } = await renderCheckInsPageWithView();

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

describe("where the client's check-ins page opens", () => {
  it("opens on Requests while a check-in waits for her answer", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON, COACH_REQUEST] };

    // act
    await renderCheckInsPage();

    // assert
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("list", { name: "Requests check-ins" }),
    ).toBeInTheDocument();
  });

  it("opens on Upcoming when no check-in waits for her answer", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON, WAITING_REQUEST] };

    // act
    await renderCheckInsPage();

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on the tab the address names even while a check-in waits for her answer", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON, COACH_REQUEST] };

    // act
    await renderCheckInsPageWithView(`${CLIENT_CHECK_INS_PATH}?view=upcoming`);

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("the client's check-ins tab in the address", () => {
  it("opens on Past when the address names it", async () => {
    // arrange, act
    await renderCheckInsPageWithView(`${CLIENT_CHECK_INS_PATH}?view=past`);

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("list", { name: "Past check-ins" }),
    ).toBeInTheDocument();
  });

  it("writes the chosen tab into the address in place, and leaves Upcoming out of it", async () => {
    // arrange
    const { router, user } = await renderCheckInsPageWithView();

    // act
    await showTab(user, "Past");

    // assert
    expect(router.state.location.search).toBe("?view=past");
    expect(router.state.historyAction).toBe("REPLACE");

    // act
    await showTab(user, "Upcoming");

    // assert
    expect(router.state.location.search).toBe("");
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on Upcoming when the address names a tab that doesn't exist", async () => {
    // arrange, act
    await renderCheckInsPageWithView(`${CLIENT_CHECK_INS_PATH}?view=archive`);

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).toBeInTheDocument();
  });
});

describe("the client's check-in named in the address", () => {
  it("opens on the tab holding the check-in her notification names, focused", async () => {
    // arrange, act
    await renderCheckInsPageWithView(clientCheckInPath(PASSED.id));

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(document.getElementById(`checkin-${PASSED.id}`)).toHaveFocus(),
    );
  });

  it("switches to the tab holding the check-in and focuses it when she follows its link from the page, every time she follows it", async () => {
    // arrange
    const { router } = await renderCheckInsPageWithView();
    const anchor = () => document.getElementById(`checkin-${CANCELLED.id}`);

    // act
    await act(() => router.navigate(clientCheckInPath(CANCELLED.id)));

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => expect(anchor()).toHaveFocus());

    // act
    anchor()?.blur();
    await act(() => router.navigate(clientCheckInPath(CANCELLED.id)));

    // assert
    await waitFor(() => expect(anchor()).toHaveFocus());
  });

  it("drops the check-in from the address once she chooses another tab", async () => {
    // arrange
    const { router, user } = await renderCheckInsPageWithView(
      clientCheckInPath(PASSED.id),
    );

    // act
    await showTab(user, "Upcoming");

    // assert
    expect(router.state.location.search).toBe("");
    expect(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).toBeInTheDocument();
  });
});

describe("the client answering her coach's request", () => {
  it("shows her coach's request first under Requests, counted on the tab, with the coach's note and a way to approve or decline it", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST, COACH_REQUEST] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, /^Requests\s*1 waiting on you$/);

    // assert
    const rows = within(
      await screen.findByRole("list", { name: "Requests check-ins" }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Ad-hoc · Requested by your coach");
    expect(rows[0]).toHaveTextContent(
      'Your coach: "Let\'s look at your first two weeks"',
    );
    expect(buttonNamesIn(rows[0])).toEqual([
      "Decline",
      "Approve",
      "More actions for the check-in on Mon, Oct 19 at 12:00 PM",
    ]);
    expect(rows[1]).toHaveTextContent("Ad-hoc · Requested by you");
    expect(
      within(rows[1]).getByRole("button", { name: "Cancel request" }),
    ).toBeEnabled();
  });

  it("approves it from her time zone, showing the work in progress, and moves it to Upcoming", async () => {
    // arrange
    listing = { checkIns: [COACH_REQUEST] };
    let release: () => void = () => {};
    const approvals: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.post(APPROVAL_URL, async ({ params, request }) => {
        approvals.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        listing = { checkIns: [COACH_REQUEST_APPROVED] };
        return HttpResponse.json({
          status: "approved",
          checkInId: COACH_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, /^Requests/);

    // act
    await user.click(screen.getByRole("button", { name: "Approve" }));
    const busy = await screen.findByRole("button", { name: "Approving…" });
    const busyState = [
      busy.hasAttribute("disabled"),
      screen.getByRole("button", { name: "Decline" }).hasAttribute("disabled"),
    ];
    release();

    // assert
    expect(busyState).toEqual([true, true]);
    expect(await screen.findByText("Check-in approved")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Requests" })).not.toHaveTextContent(
      /\d/,
    );
    await showTab(user, "Upcoming");
    expect(
      within(
        await screen.findByRole("list", { name: "Upcoming check-ins" }),
      ).getByRole("link", { name: "Join Meet" }),
    ).toHaveAttribute("href", `/client/checkins/${COACH_REQUEST.id}/join`);
    expect(approvals).toEqual([
      { checkInId: COACH_REQUEST.id, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it("declines it from her time zone and confirms it", async () => {
    // arrange
    listing = { checkIns: [COACH_REQUEST] };
    const declines: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.post(DECLINE_URL, async ({ params, request }) => {
        declines.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        listing = { checkIns: [] };
        return HttpResponse.json({
          status: "declined",
          checkInId: COACH_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, /^Requests/);

    // act
    await user.click(screen.getByRole("button", { name: "Decline" }));

    // assert
    expect(await screen.findByText("Check-in declined")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    expect(declines).toEqual([
      { checkInId: COACH_REQUEST.id, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it.each([
    ["Approve", APPROVAL_URL],
    ["Decline", DECLINE_URL],
  ])(
    "says the request is no longer waiting when she answers it too late on %s, and reads her check-ins again",
    async (action, url) => {
      // arrange
      listing = { checkIns: [COACH_REQUEST] };
      server.use(
        http.post(url, () =>
          HttpResponse.json({ error: "ended" }, { status: 409 }),
        ),
      );
      const user = await renderCheckInsPage();
      await showTab(user, /^Requests/);
      const readsBefore = listingReads;

      // act
      await user.click(screen.getByRole("button", { name: action }));

      // assert
      expect(
        await screen.findByText(
          "This request is no longer waiting for an answer.",
        ),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(listingReads).toBeGreaterThan(readsBefore);
      });
    },
  );

  it("passes the axe checks with her coach's request waiting", async () => {
    // arrange
    listing = { checkIns: [COACH_REQUEST] };
    const { baseElement, user } = await renderCheckInsPageWithView();

    // act
    await showTab(user, /^Requests/);

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

describe("the client asking for a check-in", () => {
  it("opens the request on its title, offers only open times step by step and sends her note with the chosen time", async () => {
    // arrange
    const requests = answerRequests(() =>
      HttpResponse.json(
        { status: "requested", checkInId: WAITING_REQUEST.id },
        { status: 201 },
      ),
    );
    answerOpenTimes();
    const user = await renderCheckInsPage();

    // act
    await user.click(desktopRequestButton());
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });
    const title = within(dialog).getByRole("heading", {
      level: 3,
      name: "Request a check-in",
    });
    const focusOnOpen = document.activeElement;
    const beforeDay = (
      await within(dialog).findByRole("button", {
        name: /Thursday,? 15 October 2026/,
      })
    ).ownerDocument.activeElement;
    const stepBeforeDay = stepButton(dialog).textContent;
    await user.click(
      within(dialog).getByRole("button", {
        name: /Thursday,? 15 October 2026/,
      }),
    );
    const afterDay = stepButton(dialog).textContent;
    await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));
    const afterTime = stepButton(dialog).textContent;
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach",
      }),
      "My knee feels off after lunges",
    );
    listing = { checkIns: [WAITING_REQUEST] };
    await user.click(stepButton(dialog));

    // assert
    expect(focusOnOpen).toBe(title);
    expect(beforeDay).toBe(title);
    expect(stepBeforeDay).toBe("Select a date");
    expect(dialog).toHaveTextContent(
      "Pick a date and time that works for you. Your coach will approve or decline it.",
    );
    expect(afterDay).toBe("Select a time");
    expect(afterTime).toBe("Request 6:00 PM");
    expect(
      await screen.findByText("Check-in requested for Thu, Oct 15"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(requests).toEqual([
      {
        note: "My knee feels off after lunges",
        startsAt: THURSDAY_EVENING,
        timeZone: TIME_ZONE,
      },
    ]);
    expect(desktopRequestButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the times loading while they are on their way", async () => {
    // arrange
    let release: () => void = () => {};
    server.use(
      http.get(OPEN_TIMES_URL, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({ times: OPEN_TIMES });
      }),
    );
    const user = await renderCheckInsPage();

    // act
    await user.click(desktopRequestButton());
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });

    // assert
    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "Loading open times…",
    );
    expect(stepButton(dialog)).toBeDisabled();
    release();
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });
  });

  it("says when the times did not load and tries again from inside the message", async () => {
    // arrange
    let attempts = 0;
    server.use(
      http.get(OPEN_TIMES_URL, () => {
        attempts += 1;
        return attempts === 1
          ? new HttpResponse("Internal Server Error", { status: 500 })
          : HttpResponse.json({ times: OPEN_TIMES });
      }),
    );
    const user = await renderCheckInsPage();
    await user.click(desktopRequestButton());
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });
    const alert = await within(dialog).findByRole("alert");

    // act
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    // assert
    expect(alert).toHaveTextContent(
      "We couldn't load the open times just now.",
    );
    expect(
      await within(dialog).findByRole("button", {
        name: /Thursday,? 15 October 2026/,
      }),
    ).toBeEnabled();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("tells her a time was taken, refreshes the times and keeps her note", async () => {
    // arrange
    answerRequests(() =>
      HttpResponse.json({ error: "time_taken" }, { status: 409 }),
    );
    let reads = 0;
    server.use(
      http.get(OPEN_TIMES_URL, () => {
        reads += 1;
        return HttpResponse.json({
          times:
            reads === 1 ? OPEN_TIMES : [THURSDAY_AFTERNOON, FRIDAY_AFTERNOON],
        });
      }),
    );
    const user = await renderCheckInsPage();
    await user.click(desktopRequestButton());
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });
    await user.click(
      await within(dialog).findByRole("button", {
        name: /Thursday,? 15 October 2026/,
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach",
      }),
      "Form check",
    );

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "That time is no longer free. Pick another one.",
    );
    await waitFor(() => {
      expect(
        within(dialog).queryByRole("button", { name: "6:00 PM" }),
      ).not.toBeInTheDocument();
    });
    expect(
      within(dialog).getByRole("button", { name: "5:00 PM" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(stepButton(dialog)).toHaveTextContent("Select a time");
    expect(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach",
      }),
    ).toHaveValue("Form check");
    expect(reads).toBe(2);
  });

  it("can be reached and dismissed by keyboard, handing focus back to the request button", async () => {
    // arrange
    answerOpenTimes();
    const user = await renderCheckInsPage();
    desktopRequestButton().focus();

    // act
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(desktopRequestButton()).toHaveFocus();
  });

  it("passes the axe checks with the request open", async () => {
    // arrange
    answerOpenTimes();
    const { baseElement, user } = await renderCheckInsPageWithView();
    await user.click(desktopRequestButton());
    const dialog = await screen.findByRole("dialog", {
      name: "Request a check-in",
    });
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("the request button while her request waits", () => {
  it("holds back a second request without a line explaining it", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST, APPROVED_SOON] };

    // act
    await renderCheckInsPage();

    // assert
    const buttons = requestButtons();
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toHaveAccessibleDescription(WAITING_REASON);
    }
    expect(screen.queryByText(WAITING_REASON)).not.toBeInTheDocument();
  });

  it.each([
    ["header", 0],
    ["floating", 1],
  ])("explains itself when she hovers the %s button", async (_where, index) => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();
    const button = requestButtons()[index];

    // act
    await user.hover(button);

    // assert
    expect(await screen.findByText(WAITING_REASON)).toBeVisible();
    expect(button).toHaveAccessibleDescription(WAITING_REASON);
  });

  it.each([
    ["header", 0],
    ["floating", 1],
  ])("explains itself when she taps the %s button", async (_where, index) => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();

    // act
    await user.pointer({ keys: "[TouchA]", target: requestButtons()[index] });

    // assert
    expect(await screen.findByText(WAITING_REASON)).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Request a check-in" }),
    ).not.toBeInTheDocument();
  });

  it("explains itself when she tabs to the header button", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();

    // act
    await user.tab();

    // assert
    const [headerButton] = requestButtons();
    expect(headerButton).toHaveFocus();
    expect(headerButton).toHaveAccessibleDescription(WAITING_REASON);
  });

  it("explains itself when she reaches the floating button from the keyboard", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();

    // act
    await user.tab({ shift: true });

    // assert
    const [, floatingButton] = requestButtons();
    expect(floatingButton).toHaveFocus();
    expect(floatingButton).toHaveAccessibleDescription(WAITING_REASON);
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("does not open the request on %s", async (_key, keys) => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();
    await user.tab();

    // act
    await user.keyboard(keys);

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Request a check-in" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(WAITING_REASON)).toBeInTheDocument();
  });

  it("does not open the request on a click", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const user = await renderCheckInsPage();
    const [headerButton, floatingButton] = requestButtons();

    // act
    await user.click(headerButton);
    await user.click(floatingButton);

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Request a check-in" }),
    ).not.toBeInTheDocument();
  });

  it("passes the axe checks with the reason open", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    const { baseElement, user } = await renderCheckInsPageWithView();
    await user.hover(desktopRequestButton());
    await screen.findByText(WAITING_REASON);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("lets her ask again once the request is cancelled", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    server.use(
      http.post(WITHDRAWAL_URL, () => {
        listing = { checkIns: [] };
        return HttpResponse.json({
          status: "withdrawn",
          checkInId: WAITING_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Requests");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));

    // assert
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    for (const button of requestButtons()) {
      expect(button).not.toHaveAttribute("aria-disabled");
    }
  });
});

describe("the client cancelling her waiting request", () => {
  it("shows the request being cancelled, confirms it and drops it from her requests", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    let release: () => void = () => {};
    const withdrawn: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.post(WITHDRAWAL_URL, async ({ params, request }) => {
        withdrawn.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        listing = { checkIns: [] };
        return HttpResponse.json({
          status: "withdrawn",
          checkInId: WAITING_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Requests");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    const busy = await screen.findByRole("button", { name: "Cancelling…" });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    expect(withdrawn).toEqual([
      { checkInId: WAITING_REQUEST.id, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it("says the request was already answered and reads her check-ins again", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    server.use(
      http.post(WITHDRAWAL_URL, () =>
        HttpResponse.json({ error: "not_pending" }, { status: 409 }),
      ),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Requests");
    const readsBefore = listingReads;

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));

    // assert
    expect(
      await screen.findByText(
        "This request is no longer waiting for an answer.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listingReads).toBeGreaterThan(readsBefore);
    });
  });

  it("says the request was not cancelled when the server could not answer", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST] };
    server.use(http.post(WITHDRAWAL_URL, () => HttpResponse.error()));
    const user = await renderCheckInsPage();
    await showTab(user, "Requests");

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));

    // assert
    expect(
      await screen.findByText("Your request wasn't cancelled. Try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel request" }),
    ).toBeEnabled();
  });
});

describe("the client's moved check-ins", () => {
  it("shows her coach's new time with the earlier time struck through and her coach's note, to accept, decline or answer with another", async () => {
    // arrange
    listing = { checkIns: [COACH_NEW_TIME] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, /^Requests/);
    const row = within(
      await screen.findByRole("list", { name: "Requests check-ins" }),
    ).getByRole("listitem");
    await user.click(
      within(row).getByRole("button", { name: COACH_NEW_TIME_MENU }),
    );

    // assert
    expect(row).toHaveTextContent("Ad-hoc · New time from your coach");
    expect(struckThroughTimeIn(row)).toBe("Wed, Oct 14 · 10:00 AM");
    expect(row).toHaveTextContent("Thu, Oct 15");
    expect(row).toHaveTextContent(
      'Your coach: "I am travelling that Wednesday. Could we do Thursday at 2 PM instead?"',
    );
    expect(buttonNamesIn(row)).toEqual([
      "Decline",
      "Accept",
      COACH_NEW_TIME_MENU,
    ]);
    expect(menuItemNames(await screen.findByRole("menu"))).toEqual([
      "Reschedule",
    ]);
  });

  it("shows her own new time waiting for her coach, with nothing to take it back", async () => {
    // arrange
    listing = { checkIns: [OWN_NEW_TIME] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, /^Requests/);

    // assert
    const row = within(
      await screen.findByRole("list", { name: "Requests check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Ad-hoc · New time from you");
    expect(struckThroughTimeIn(row)).toBe("Fri, Oct 16 · 10:00 AM");
    expect(row).toHaveTextContent(
      'You: "I have a work call that morning. Could we meet on Friday afternoon?"',
    );
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepts her coach's new time from her time zone and moves it to Upcoming, marked as rescheduled", async () => {
    // arrange
    listing = { checkIns: [COACH_NEW_TIME] };
    const approvals: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.post(APPROVAL_URL, async ({ params, request }) => {
        approvals.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        listing = { checkIns: [COACH_NEW_TIME_ACCEPTED] };
        return HttpResponse.json({
          status: "approved",
          checkInId: COACH_NEW_TIME.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, /^Requests/);

    // act
    await user.click(screen.getByRole("button", { name: "Accept" }));

    // assert
    expect(await screen.findByText("Check-in approved")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    await showTab(user, "Upcoming");
    const row = within(
      await screen.findByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");
    expect(
      within(row).getByRole("button", {
        name: "Rescheduled from Wed, Oct 14 · 10:00 AM",
      }),
    ).toBeInTheDocument();
    expect(struckThroughTimeIn(row)).toBeUndefined();
    expect(approvals).toEqual([
      { checkInId: COACH_NEW_TIME.id, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it("marks a rescheduled check-in with the time it moved from, explained on hover", async () => {
    // arrange
    listing = { checkIns: [RESCHEDULED] };
    const user = await renderCheckInsPage();
    const row = within(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");

    // act
    await user.hover(
      within(row).getByRole("button", {
        name: "Rescheduled from Thu, Oct 15 · 11:00 AM",
      }),
    );

    // assert
    expect(
      await screen.findByText("Rescheduled from Thu, Oct 15 · 11:00 AM"),
    ).toBeInTheDocument();
    expect(row).toHaveTextContent("Ad-hoc · Requested by you");
    expect(row).toHaveTextContent('You: "Want to go over my food log"');
  });

  it("passes the axe checks with moved check-ins listed", async () => {
    // arrange
    listing = { checkIns: [COACH_NEW_TIME, OWN_NEW_TIME, RESCHEDULED] };
    const { baseElement, user } = await renderCheckInsPageWithView();

    // act
    await showTab(user, /^Requests/);

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

describe("the client's upcoming check-in menu", () => {
  it("offers to reschedule or cancel an upcoming check-in", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    const user = await renderCheckInsPage();

    // act
    await user.click(screen.getByRole("button", { name: SOON_MENU }));

    // assert
    expect(menuItemNames(await screen.findByRole("menu"))).toEqual([
      "Reschedule",
      "Cancel",
    ]);
  });

  it("offers only Reschedule on a check-in her coach scheduled, since only her coach may cancel it", async () => {
    // arrange
    listing = { checkIns: [COACH_REQUEST_APPROVED] };
    const user = await renderCheckInsPage();

    // act
    await user.click(
      screen.getByRole("button", { name: COACH_REQUEST_APPROVED_MENU }),
    );

    // assert
    expect(menuItemNames(await screen.findByRole("menu"))).toEqual([
      "Reschedule",
    ]);
  });

  it("leaves the menu out of her past and cancelled check-ins", async () => {
    // arrange
    listing = { checkIns: [PASSED, CANCELLED] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, "Past");

    // assert
    const list = await screen.findByRole("list", { name: "Past check-ins" });
    expect(within(list).queryByRole("button")).not.toBeInTheDocument();
  });

  it("proposes another time from the menu and hands focus back to the menu when she closes it", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    answerOpenTimes();
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: SOON_MENU }));

    // act
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Propose a new time",
    });
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });
    await user.keyboard("{Escape}");

    // assert
    expect(dialog).toHaveTextContent(
      "Currently set for Wed, Oct 14 · 10:00 AM",
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: SOON_MENU })).toHaveFocus();
  });

  it("proposes a new time with her note and says so", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    answerOpenTimes();
    const proposals: unknown[] = [];
    server.use(
      http.post(`*${CHECK_INS_API_PATHS.newTime}`, async ({ request }) => {
        proposals.push(await request.json());
        return HttpResponse.json({
          status: "proposed",
          checkInId: APPROVED_SOON.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: SOON_MENU }));
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Propose a new time",
    });
    await user.click(
      await within(dialog).findByRole("button", {
        name: /Thursday,? 15 October 2026/,
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach",
      }),
      "Evenings work better",
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Propose 6:00 PM" }),
    );

    // assert
    expect(await screen.findByText("New time proposed")).toBeInTheDocument();
    expect(proposals).toEqual([
      {
        note: "Evenings work better",
        startsAt: THURSDAY_EVENING,
        timeZone: TIME_ZONE,
      },
    ]);
  });

  it("cancels an upcoming check-in once she confirms, and lists it under Past as cancelled", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    const cancellations: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.post(CANCELLATION_URL, async ({ params, request }) => {
        cancellations.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        listing = {
          checkIns: [
            {
              ...APPROVED_SOON,
              status: "cancelled",
              tab: "past",
              viewerProposal: "none",
              viewerMayCancel: false,
            },
          ],
        };
        return HttpResponse.json({
          status: "cancelled",
          checkInId: APPROVED_SOON.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: SOON_MENU }));
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Cancel",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this check-in?",
    });
    const description = dialog.textContent;

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(description).toContain("Wed, Oct 14 at 10:00 AM.");
    expect(await screen.findByText("Check-in cancelled")).toBeInTheDocument();
    expect(
      await screen.findByText("No upcoming check-ins"),
    ).toBeInTheDocument();
    await showTab(user, "Past");
    expect(
      within(
        await screen.findByRole("list", { name: "Past check-ins" }),
      ).getByText("Cancelled"),
    ).toBeInTheDocument();
    expect(cancellations).toEqual([
      { checkInId: APPROVED_SOON.id, body: { timeZone: TIME_ZONE } },
    ]);
  });

  it("keeps the check-in when she changes her mind, handing focus back to the menu", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: SOON_MENU }));
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Cancel",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this check-in?",
    });

    // act
    await user.click(within(dialog).getByRole("button", { name: "Keep" }));

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: SOON_MENU })).toHaveFocus();
  });

  it("works the menu by keyboard, from the trigger to the cancel question and back", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    const user = await renderCheckInsPage();
    screen.getByRole("button", { name: SOON_MENU }).focus();

    // act
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await screen.findByRole("dialog", { name: "Cancel this check-in?" });
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: SOON_MENU })).toHaveFocus();
  });

  it("passes the axe checks with the menu open", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON] };
    const { baseElement, user } = await renderCheckInsPageWithView();
    await user.click(screen.getByRole("button", { name: SOON_MENU }));
    await screen.findByRole("menu");

    // act
    const results = await axeWithMenuOpen(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("Reschedule on a check-in moved twice", () => {
  it("stays in the menu, held back", async () => {
    // arrange
    listing = { checkIns: [MOVED_TWICE] };
    const user = await renderCheckInsPage();

    // act
    await user.click(screen.getByRole("button", { name: MOVED_TWICE_MENU }));

    // assert
    expect(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("explains itself on hover", async () => {
    // arrange
    listing = { checkIns: [MOVED_TWICE] };
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: MOVED_TWICE_MENU }));

    // act
    await user.hover(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    );

    // assert
    expect(await screen.findByText(MOVED_TWICE_REASON)).toBeInTheDocument();
  });

  it("is reached from the keyboard and does nothing on Enter", async () => {
    // arrange
    listing = { checkIns: [MOVED_TWICE] };
    const user = await renderCheckInsPage();
    screen.getByRole("button", { name: MOVED_TWICE_MENU }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{ArrowUp}");

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByRole("menuitem", { name: "Reschedule" })).toHaveFocus();
    expect(
      screen.queryByRole("dialog", { name: "Propose a new time" }),
    ).not.toBeInTheDocument();
  });

  it("explains itself on a tap without opening the new time", async () => {
    // arrange
    listing = { checkIns: [MOVED_TWICE] };
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: MOVED_TWICE_MENU }));

    // act
    await user.pointer({
      keys: "[TouchA]",
      target: within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    });

    // assert
    expect(await screen.findByText(MOVED_TWICE_REASON)).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Propose a new time" }),
    ).not.toBeInTheDocument();
  });

  it("passes the axe checks with the reason open", async () => {
    // arrange
    listing = { checkIns: [MOVED_TWICE] };
    const { baseElement, user } = await renderCheckInsPageWithView();
    await user.click(screen.getByRole("button", { name: MOVED_TWICE_MENU }));
    await user.hover(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    );
    await screen.findByText(MOVED_TWICE_REASON);

    // act
    const results = await axeWithMenuOpen(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("a weekly check-in on the client's check-ins page", () => {
  it("shows a clashing next week under Upcoming as her coach finding a new time, with nothing to act on", async () => {
    // arrange, act
    listing = { checkIns: [NEXT_WEEKLY_CLASH] };
    await renderCheckInsPage();

    // assert
    const row = within(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Wed, Oct 21");
    expect(within(row).getByText("Clash")).toBeInTheDocument();
    expect(row).toHaveTextContent("Your coach is finding a new time");
    expect(
      within(row).queryByRole("link", { name: "Join Meet" }),
    ).not.toBeInTheDocument();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists every week to come, lets her move only the next one and cancel none", async () => {
    // arrange
    listing = { checkIns: [LAST_WEEKLY, NEXT_WEEKLY, LATER_WEEKLY] };
    const user = await renderCheckInsPage();
    const rows = within(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).getAllByRole("listitem");

    // act
    const menus = [];
    for (const name of [
      NEXT_WEEKLY_MENU,
      LATER_WEEKLY_MENU,
      LAST_WEEKLY_MENU,
    ]) {
      await user.click(screen.getByRole("button", { name }));
      const menu = await screen.findByRole("menu");
      menus.push(
        within(menu)
          .getAllByRole("menuitem")
          .map((item) => ({
            name: item.textContent,
            heldBack: item.getAttribute("aria-disabled") === "true",
          })),
      );
      await user.keyboard("{Escape}");
    }

    // assert
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Wed, Oct 21"),
      expect.stringContaining("Wed, Oct 28"),
      expect.stringContaining("Wed, Nov 4"),
    ]);
    expect(menus).toEqual([
      [{ name: "Reschedule", heldBack: false }],
      [{ name: "Reschedule", heldBack: true }],
      [{ name: "Reschedule", heldBack: true }],
    ]);
    expect(
      within(rows[0]).getByRole("link", { name: "Join Meet" }),
    ).toBeVisible();
    expect(rows[0]).not.toHaveTextContent("Requested by");
  });

  it("explains why Reschedule is held back on a later week", async () => {
    // arrange
    listing = { checkIns: [NEXT_WEEKLY, LATER_WEEKLY] };
    const user = await renderCheckInsPage();
    await user.click(screen.getByRole("button", { name: LATER_WEEKLY_MENU }));

    // act
    await user.hover(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Reschedule",
      }),
    );

    // assert
    expect(await screen.findByText(LATER_WEEK_REASON)).toBeInTheDocument();
  });

  it("passes the axe checks with a clashing next week", async () => {
    // arrange
    listing = { checkIns: [NEXT_WEEKLY_CLASH] };
    const { baseElement } = await renderCheckInsPageWithView();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("narrowing the client's check-ins", () => {
  it("counts each kind on Upcoming and narrows to her weekly check-ins, with no search to offer", async () => {
    // arrange
    listing = {
      checkIns: [APPROVED_SOON, APPROVED_LATER, NEXT_WEEKLY, LATER_WEEKLY],
    };
    const { router, user } = await renderCheckInsPageWithView();

    // act
    const offered = await optionsOffered(user, "Kind");
    await choose(user, "Kind", /^Weekly \d+$/);

    // assert
    expect(offered).toEqual(["All kinds 4", "Weekly 2", "Ad-hoc 2"]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ kind: "recurring" });
    });
    expect(listedDays()).toEqual(["Wed, Oct 21", "Wed, Oct 28"]);
    expect(
      screen.queryByRole("searchbox", { name: "Search check-ins" }),
    ).not.toBeInTheDocument();
  });

  it("counts who must answer under Requests, worded for her coach, and narrows to the request waiting for her coach", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST, COACH_REQUEST, APPROVED_SOON] };
    const { router, user } = await renderCheckInsPageWithView();

    // act
    const offered = await optionsOffered(user, "Waiting on");
    await choose(user, "Waiting on", /^Waiting for your coach \d+$/);

    // assert
    expect(offered).toEqual([
      "All requests 2",
      "Needs your answer 1",
      "Waiting for your coach 1",
    ]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ waiting: "them" });
    });
    expect(listedDays()).toEqual(["Fri, Oct 16"]);
  });

  it("offers Waiting on only under Requests and leaves it behind with the tab", async () => {
    // arrange
    listing = { checkIns: [WAITING_REQUEST, COACH_REQUEST, APPROVED_SOON] };
    const { router, user } = await renderCheckInsPageWithView(
      `${CLIENT_CHECK_INS_PATH}?waiting=you`,
    );

    // act
    await showTab(user, "Upcoming");

    // assert
    expect(
      screen.queryByRole("combobox", { name: "Waiting on" }),
    ).not.toBeInTheDocument();
    expect(addressOf(router)).toEqual({ view: "upcoming" });
  });

  it("narrows without reading her check-ins again, and reads them again for a check-in she is sent to", async () => {
    // arrange
    listing = { checkIns: [APPROVED_SOON, NEXT_WEEKLY, PASSED] };
    const { router, user } = await renderCheckInsPageWithView();

    // act
    await choose(user, "Kind", /^Ad-hoc \d+$/);
    await toggleSortDirection(user);
    const readsWhileNarrowing = listingReads;
    await act(() => router.navigate(clientCheckInPath(PASSED.id)));

    // assert
    expect(readsWhileNarrowing).toBe(1);
    await waitFor(() => {
      expect(listingReads).toBe(2);
    });
  });
});

describe("a search left in the client's address", () => {
  it("hides nothing, changes no count and offers nothing to clear", async () => {
    // arrange
    listing = {
      checkIns: [APPROVED_SOON, APPROVED_LATER, NEXT_WEEKLY, LATER_WEEKLY],
    };
    const { user } = await renderCheckInsPageWithView(
      `${CLIENT_CHECK_INS_PATH}?q=zzz`,
    );

    // act
    const offered = await optionsOffered(user, "Kind");

    // assert
    expect(listedRows()).toHaveLength(4);
    expect(offered).toEqual(["All kinds 4", "Weekly 2", "Ad-hoc 2"]);
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });
});

describe("sorting the client's check-ins", () => {
  it("lists Upcoming soonest first and flips it with the direction toggle", async () => {
    // arrange
    listing = { checkIns: [APPROVED_LATER, APPROVED_SOON, NEXT_WEEKLY] };
    const { router, user } = await renderCheckInsPageWithView();
    const defaultSort = [
      screen.getByRole("combobox", { name: "Sort by" }).textContent,
      screen
        .getByRole("button", { name: "Soonest first" })
        .getAttribute("aria-pressed"),
      ...listedDays(),
    ];

    // act
    await toggleSortDirection(user);

    // assert
    expect(defaultSort).toEqual([
      "Check-in date: soonest first",
      "false",
      "Wed, Oct 14",
      "Tue, Oct 20",
      "Wed, Oct 21",
    ]);
    expect(listedDays()).toEqual(["Wed, Oct 21", "Tue, Oct 20", "Wed, Oct 14"]);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Check-in date: latest first",
    );
    expect(
      screen.getByRole("button", { name: "Latest first" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(addressOf(router)).toEqual({ dir: "desc" });
  });
});

describe("paging through the client's check-ins", () => {
  it("shows ten check-ins at a time, says which ones and walks to the next page", async () => {
    // arrange
    listing = { checkIns: ELEVEN_UPCOMING };
    const { router, user } = await renderCheckInsPageWithView();
    const firstPage = [
      screen.getByText("Showing 1–10 of 11").textContent,
      listedRows().length,
    ];

    // act
    await user.click(screen.getByRole("link", { name: "Go to page 2" }));

    // assert
    expect(firstPage).toEqual(["Showing 1–10 of 11", 10]);
    expect(await screen.findByText("Showing 11–11 of 11")).toBeInTheDocument();
    expect(listedDays()).toEqual(["Sat, Oct 24"]);
    expect(addressOf(router)).toEqual({ page: "2" });
  });

  it("returns to the first page when she flips the direction", async () => {
    // arrange
    listing = { checkIns: ELEVEN_UPCOMING };
    const { router, user } = await renderCheckInsPageWithView(
      `${CLIENT_CHECK_INS_PATH}?page=2`,
    );

    // act
    await toggleSortDirection(user);

    // assert
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ dir: "desc" });
    });
    expect(screen.getByText("Showing 1–10 of 11")).toBeInTheDocument();
    expect(listedDays()[0]).toBe("Sat, Oct 24");
  });

  it("clamps a page past the last to the last page", async () => {
    // arrange, act
    listing = { checkIns: ELEVEN_UPCOMING };
    await renderCheckInsPageWithView(`${CLIENT_CHECK_INS_PATH}?page=9`);

    // assert
    expect(screen.getByText("Showing 11–11 of 11")).toBeInTheDocument();
  });
});

describe("a view that hides every client check-in", () => {
  it("says nothing matches and Clear filters clears the kind but keeps the tab", async () => {
    // arrange
    const { router, user } = await renderCheckInsPageWithView(
      `${CLIENT_CHECK_INS_PATH}?view=past&kind=recurring`,
    );
    const noMatch = [
      screen.getByText("No check-ins match").textContent,
      screen.getByText("Try another filter or search.").textContent,
    ];

    // act
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    // assert
    expect(noMatch).toEqual([
      "No check-ins match",
      "Try another filter or search.",
    ]);
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ view: "past" });
    });
    expect(listedRows()).toHaveLength(2);
  });

  it("keeps a tab's own empty copy, with nothing to clear, when the tab holds nothing", async () => {
    // arrange, act
    await renderCheckInsPageWithView(
      `${CLIENT_CHECK_INS_PATH}?view=requests&kind=recurring`,
    );

    // assert
    expect(screen.getByText("No open requests")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });
});

describe("a check-in the client is sent to on a later page", () => {
  it("opens the page holding it, focused, and her first move drops the check-in", async () => {
    // arrange
    listing = { checkIns: ELEVEN_UPCOMING };
    const { router, user } = await renderCheckInsPageWithView(
      clientCheckInPath(ELEVENTH_UPCOMING.id),
    );
    const anchor = document.getElementById(`checkin-${ELEVENTH_UPCOMING.id}`);
    await waitFor(() => expect(anchor).toHaveFocus());
    const landedOn = screen.getByText("Showing 11–11 of 11").textContent;

    // act
    await toggleSortDirection(user);

    // assert
    expect(landedOn).toBe("Showing 11–11 of 11");
    await waitFor(() => {
      expect(addressOf(router)).toEqual({ dir: "desc" });
    });
    expect(await screen.findByText("Showing 1–10 of 11")).toBeInTheDocument();
  });
});

type CheckInsRouter = ReturnType<typeof createMemoryRouter>;

function listedRows(): HTMLElement[] {
  const list = screen.queryByRole("list", { name: /check-ins$/ });

  return list ? within(list).getAllByRole("listitem") : [];
}

function addressOf(router: CheckInsRouter): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(router.state.location.search));
}

async function optionsOffered(
  user: UserEvent,
  control: string,
): Promise<string[]> {
  await user.click(screen.getByRole("combobox", { name: control }));
  const offered = screen
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
  await user.keyboard("{Escape}");

  return offered;
}

async function choose(
  user: UserEvent,
  control: string,
  option: RegExp,
): Promise<void> {
  await user.click(screen.getByRole("combobox", { name: control }));
  await user.click(screen.getByRole("option", { name: option }));
}

async function toggleSortDirection(user: UserEvent): Promise<void> {
  await user.click(
    screen.getByRole("button", { name: /^(Soonest first|Latest first)$/ }),
  );
}

function listedDays(): string[] {
  return listedRows().map(
    (row) => row.textContent?.match(SHOWN_DAY)?.[0] ?? "",
  );
}

function answerOpenTimes(times: readonly string[] = OPEN_TIMES) {
  server.use(http.get(OPEN_TIMES_URL, () => HttpResponse.json({ times })));
}

function answerRequests(answer: () => Response): unknown[] {
  const received: unknown[] = [];
  server.use(
    http.post(REQUESTS_URL, async ({ request }) => {
      received.push(await request.json());
      return answer();
    }),
  );

  return received;
}

function buttonNamesIn(element: HTMLElement): (string | null)[] {
  return within(element)
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? button.textContent);
}

function struckThroughTimeIn(row: HTMLElement): string | undefined {
  return row.querySelector("s")?.textContent ?? undefined;
}

function menuItemNames(menu: HTMLElement): (string | null)[] {
  return within(menu)
    .getAllByRole("menuitem")
    .map(({ textContent }) => textContent);
}

function requestButtons(): HTMLElement[] {
  return screen.getAllByRole("button", { name: "Request check-in" });
}

function desktopRequestButton(): HTMLElement {
  const [desktopButton] = requestButtons();

  return desktopButton;
}

function stepButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("button", {
    name: /^(Select a date|Select a time|Request .+|Requesting…)$/,
  });
}

async function showTab(user: UserEvent, name: string | RegExp): Promise<void> {
  await user.click(screen.getByRole("tab", { name }));
  await screen.findByRole("tab", { name, selected: true });
}

async function renderCheckInsPage() {
  const { user } = await renderCheckInsPageWithView();

  return user;
}

async function renderCheckInsPageWithView(entry = CLIENT_CHECK_INS_PATH) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Client portal content">
            <ClientCheckInsRoute />
          </main>
        ),
        loader: () => {
          listingReads += 1;
          return listing;
        },
        path: CLIENT_CHECK_INS_PATH,
        shouldRevalidate,
      },
      {
        loader: frameworkModeLoader(openTimesLoader),
        path: CHECK_INS_API_PATHS.openTimes,
        shouldRevalidate: shouldRevalidateOpenTimes,
      },
      {
        action: frameworkModeAction(requestCheckIn),
        path: CHECK_INS_API_PATHS.requests,
      },
      {
        action: frameworkModeAction(withdrawCheckIn),
        path: CHECK_INS_API_PATHS.withdrawal,
      },
      {
        action: frameworkModeAction(approveCheckIn),
        path: CHECK_INS_API_PATHS.approval,
      },
      {
        action: frameworkModeAction(declineCheckIn),
        path: CHECK_INS_API_PATHS.decline,
      },
      {
        action: frameworkModeAction(proposeNewTime),
        path: CHECK_INS_API_PATHS.newTime,
      },
      {
        action: frameworkModeAction(cancelCheckIn),
        path: CHECK_INS_API_PATHS.cancellation,
      },
    ],
    { initialEntries: [entry] },
  );

  const view = render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Check-ins" });

  return { ...view, router, user };
}
