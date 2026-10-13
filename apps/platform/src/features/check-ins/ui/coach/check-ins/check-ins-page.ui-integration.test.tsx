// @vitest-environment jsdom

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

import { clientAction as approveCheckIn } from "~/features/check-ins/api/shared/approval";
import { clientAction as cancelCheckIn } from "~/features/check-ins/api/shared/cancellation";
import { clientAction as declineCheckIn } from "~/features/check-ins/api/shared/decline";
import { clientAction as proposeNewTime } from "~/features/check-ins/api/shared/new-time";
import {
  clientLoader as openTimesLoader,
  shouldRevalidate as shouldRevalidateOpenTimes,
} from "~/features/check-ins/api/shared/open-times";
import { clientAction as withdrawCheckIn } from "~/features/check-ins/api/shared/withdrawal";
import type {
  CoachCheckIn,
  CoachCheckIns,
} from "~/features/check-ins/public/check-ins";
import {
  CHECK_INS_API_PATHS,
  COACH_CHECK_INS_PATH,
  coachCheckInPath,
} from "~/features/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/server/test-support/framework-mode-action";

import CoachCheckInsRoute from "./check-ins-page";

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";

const ANDREEA_REQUEST: CoachCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  seriesId: null,
  kind: "ad_hoc",
  status: "pending",
  tab: "requests",
  initiatedBy: "client",
  proposedBy: "client",
  awaitsViewer: true,
  viewerMayWithdraw: false,
  viewerProposal: "allowed",
  viewerMayCancel: false,
  newTimeWaits: false,
  isWaitingRequest: true,
  startsAt: "2026-10-16T09:00:00.000Z",
  endsAt: "2026-10-16T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T08:50:00.000Z",
  earlierStartsAt: null,
  moves: 0,
  note: "I have some questions about my macros",
  newTimeNote: null,
  clientId: "6a7b8c9d-0e1f-4a2b-8c3d-5e6f7a8b9c0d",
  client: { firstName: "Andreea", lastName: "Ionescu" },
};

const MARIA_REQUEST: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  startsAt: "2026-10-14T12:00:00.000Z",
  endsAt: "2026-10-14T13:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T11:50:00.000Z",
  note: null,
  client: { firstName: "Maria", lastName: "Popescu" },
};

const ANDREEA_APPROVED: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  status: "approved",
  tab: "upcoming",
  awaitsViewer: false,
  isWaitingRequest: false,
};

const ELENA_UPCOMING: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  id: "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  status: "approved",
  tab: "upcoming",
  awaitsViewer: false,
  isWaitingRequest: false,
  startsAt: "2026-10-13T07:00:00.000Z",
  endsAt: "2026-10-13T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-13T06:50:00.000Z",
  note: null,
  client: { firstName: "Elena", lastName: "Dumitru" },
};

const IOANA_OWN_REQUEST: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  id: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f7a",
  initiatedBy: "coach",
  proposedBy: "coach",
  awaitsViewer: false,
  viewerMayWithdraw: true,
  viewerProposal: "none",
  isWaitingRequest: false,
  startsAt: "2026-10-13T12:00:00.000Z",
  endsAt: "2026-10-13T13:00:00.000Z",
  joinEmphasisFrom: "2026-10-13T11:50:00.000Z",
  note: "Let's look at your first two weeks",
  client: { firstName: "Ioana", lastName: "Stan" },
};

const ANDREEA_NEW_TIME: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  id: "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a8b",
  initiatedBy: "coach",
  proposedBy: "client",
  isWaitingRequest: false,
  newTimeWaits: true,
  startsAt: "2026-10-16T13:00:00.000Z",
  endsAt: "2026-10-16T14:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T12:50:00.000Z",
  earlierStartsAt: "2026-10-16T07:00:00.000Z",
  moves: 1,
  note: "Time to look back at your first month",
  newTimeNote:
    "I have a work call that morning. Could we meet on Friday afternoon?",
};

const MARIA_CANCELLED: CoachCheckIn = {
  ...MARIA_REQUEST,
  id: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b9c",
  status: "cancelled",
  tab: "past",
  awaitsViewer: false,
  isWaitingRequest: false,
};

const UNKNOWN_CHECK_IN_ID = "6a7b8c9d-0e1f-4a2b-9c3d-5e6f7a8b9c0d";

const ELENA_ID = "7b8c9d0e-1f2a-4b3c-9d4e-6f7a8b9c0d1e";

const ELENA_CANCELLABLE: CoachCheckIn = {
  ...ELENA_UPCOMING,
  viewerMayCancel: true,
  clientId: ELENA_ID,
};

const ELENA_MOVED_TWICE: CoachCheckIn = {
  ...ELENA_CANCELLABLE,
  viewerProposal: "exhausted",
  earlierStartsAt: "2026-10-12T12:00:00.000Z",
  moves: 2,
};

const WEEKLY_SERIES_ID = "8c9d0e1f-2a3b-4c4d-8e5f-7a8b9c0d1e2f";

const ELENA_CLASH: CoachCheckIn = {
  ...ELENA_CANCELLABLE,
  id: "9d0e1f2a-3b4c-4d5e-9f6a-8b9c0d1e2f3a",
  seriesId: WEEKLY_SERIES_ID,
  kind: "recurring",
  status: "clash",
  tab: "requests",
  initiatedBy: "coach",
  proposedBy: "coach",
  awaitsViewer: true,
  viewerProposal: "allowed",
  viewerMayCancel: true,
  startsAt: "2026-10-21T15:00:00.000Z",
  endsAt: "2026-10-21T16:00:00.000Z",
  joinEmphasisFrom: "2026-10-21T14:50:00.000Z",
  note: null,
};

const ELENA_NEXT_WEEKLY: CoachCheckIn = {
  ...ELENA_CLASH,
  id: "0e1f2a3b-4c5d-4e6f-8a7b-9c0d1e2f3a4b",
  status: "approved",
  tab: "upcoming",
  awaitsViewer: false,
  startsAt: "2026-10-14T15:00:00.000Z",
  endsAt: "2026-10-14T16:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T14:50:00.000Z",
};

const ELENA_CLASH_MENU =
  "More actions for the check-in on Wed, Oct 21 at 6:00 PM";

const ELENA_MENU = "More actions for the check-in on Tue, Oct 13 at 10:00 AM";
const MOVED_TWICE_REASON = "This check-in has already been moved twice.";

const THURSDAY_AFTERNOON = "2026-10-15T14:00:00.000Z";
const THURSDAY_EVENING = "2026-10-15T15:00:00.000Z";

const APPROVAL_URL = `*${CHECK_INS_API_PATHS.approval}`;
const OPEN_TIMES_URL = `*${CHECK_INS_API_PATHS.openTimes}`;
const NEW_TIME_URL = `*${CHECK_INS_API_PATHS.newTime}`;
const CANCELLATION_URL = `*${CHECK_INS_API_PATHS.cancellation}`;
const WITHDRAWAL_URL = `*${CHECK_INS_API_PATHS.withdrawal}`;
const DECLINE_URL = `*${CHECK_INS_API_PATHS.decline}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });
const axeWithMenuOpen = configureAxe({
  rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
});

let listing: CoachCheckIns;
let listingReads = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Element.prototype.scrollIntoView = () => {};
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
  listing = { checkIns: [ANDREEA_REQUEST, MARIA_REQUEST, ELENA_UPCOMING] };
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

describe("the coach's check-ins page", () => {
  it("opens on the requests waiting for her, counted on the tab, soonest first, each naming the client and her note", async () => {
    // arrange, act
    await renderCheckInsPage();

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Check-ins" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage all client check-ins in one place."),
    ).toBeInTheDocument();
    const requestsTab = screen.getByRole("tab", {
      name: /^Requests\s*2 waiting on you$/,
    });
    expect(requestsTab).toHaveAttribute("aria-selected", "true");
    const rows = within(
      screen.getByRole("list", { name: "Requests check-ins" }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Maria Popescu")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Wed, Oct 14");
    expect(rows[0]).toHaveTextContent("Ad-hoc · Requested by Maria");
    expect(within(rows[1]).getByText("Andreea Ionescu")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent(
      'Andreea: "I have some questions about my macros"',
    );
    expect(
      within(rows[1]).getByRole("button", { name: "Approve" }),
    ).toBeEnabled();
    expect(
      within(rows[1]).getByRole("button", { name: "Decline" }),
    ).toBeEnabled();
  });

  it("offers Join Meet on her upcoming check-ins, with more actions beside it", async () => {
    // arrange
    const user = await renderCheckInsPage();

    // act
    await showTab(user, "Upcoming");

    // assert
    const row = within(
      await screen.findByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Elena Dumitru");
    expect(
      within(row).getByRole("link", { name: "Join Meet" }),
    ).toHaveAttribute("href", `/coach/checkins/${ELENA_UPCOMING.id}/join`);
    expect(
      within(row)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([ELENA_MENU]);
  });

  it.each([
    [
      "Upcoming",
      "No upcoming check-ins",
      "Approved check-ins with your clients show up here.",
    ],
    [
      "Requests",
      "No open requests",
      "Requests from your clients and the ones you send show up here.",
    ],
    [
      "Past",
      "No past check-ins yet",
      "Passed and cancelled check-ins show up here.",
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
    expect(screen.getByRole("tab", { name: "Requests" })).not.toHaveTextContent(
      /\d/,
    );
  });

  it("approves a request, showing the work in progress, and moves it to Upcoming", async () => {
    // arrange
    let release: () => void = () => {};
    const approved: string[] = [];
    server.use(
      http.post(APPROVAL_URL, async ({ params }) => {
        approved.push(String(params.checkInId));
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        listing = { checkIns: [ANDREEA_APPROVED, MARIA_REQUEST] };
        return HttpResponse.json({
          status: "approved",
          checkInId: ANDREEA_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    const row = rowNaming("Andreea Ionescu");

    // act
    await user.click(within(row).getByRole("button", { name: "Approve" }));
    const busy = await within(row).findByRole("button", {
      name: "Approving…",
    });
    const declineWhileBusy = within(row).getByRole("button", {
      name: "Decline",
    });
    const busyState = [
      busy.hasAttribute("disabled"),
      declineWhileBusy.hasAttribute("disabled"),
    ];
    release();

    // assert
    expect(busyState).toEqual([true, true]);
    expect(
      await screen.findByText("Approved check-in with Andreea Ionescu"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /^Requests\s*1 waiting on you$/ }),
      ).toBeInTheDocument();
    });
    await showTab(user, "Upcoming");
    expect(
      within(
        await screen.findByRole("list", { name: "Upcoming check-ins" }),
      ).getByText("Andreea Ionescu"),
    ).toBeInTheDocument();
    expect(approved).toEqual([ANDREEA_REQUEST.id]);
  });

  it("declines a request and confirms it", async () => {
    // arrange
    const declined: string[] = [];
    server.use(
      http.post(DECLINE_URL, ({ params }) => {
        declined.push(String(params.checkInId));
        listing = { checkIns: [MARIA_REQUEST] };
        return HttpResponse.json({
          status: "declined",
          checkInId: ANDREEA_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();

    // act
    await user.click(
      within(rowNaming("Andreea Ionescu")).getByRole("button", {
        name: "Decline",
      }),
    );

    // assert
    expect(await screen.findByText("Check-in declined")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Andreea Ionescu")).not.toBeInTheDocument();
    });
    expect(declined).toEqual([ANDREEA_REQUEST.id]);
  });

  it("says a request is no longer waiting when someone answered it first, and reads the check-ins again", async () => {
    // arrange
    server.use(
      http.post(APPROVAL_URL, () =>
        HttpResponse.json({ error: "not_pending" }, { status: 409 }),
      ),
    );
    const user = await renderCheckInsPage();
    const readsBefore = listingReads;

    // act
    await user.click(
      within(rowNaming("Andreea Ionescu")).getByRole("button", {
        name: "Approve",
      }),
    );

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

  it.each([
    ["Approve", APPROVAL_URL, "The check-in wasn't approved. Try again."],
    ["Decline", DECLINE_URL, "The check-in wasn't declined. Try again."],
  ])(
    "says the %s did not go through when the server fails, leaving the request to answer again",
    async (action, url, message) => {
      // arrange
      server.use(
        http.post(
          url,
          () => new HttpResponse("Internal Server Error", { status: 500 }),
        ),
      );
      const user = await renderCheckInsPage();
      const row = rowNaming("Andreea Ionescu");

      // act
      await user.click(within(row).getByRole("button", { name: action }));

      // assert
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: action })).toBeEnabled();
    },
  );

  it("answers by keyboard", async () => {
    // arrange
    server.use(
      http.post(DECLINE_URL, () => {
        listing = { checkIns: [MARIA_REQUEST, ELENA_UPCOMING] };
        return HttpResponse.json({
          status: "declined",
          checkInId: ANDREEA_REQUEST.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    within(rowNaming("Andreea Ionescu"))
      .getByRole("button", { name: "Decline" })
      .focus();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(await screen.findByText("Check-in declined")).toBeInTheDocument();
  });

  it("lists her own request after the ones waiting for her, marked as hers with her note, and offers only to cancel it", async () => {
    // arrange
    listing = { checkIns: [IOANA_OWN_REQUEST, ANDREEA_REQUEST, MARIA_REQUEST] };

    // act
    await renderCheckInsPage();

    // assert
    const rows = within(
      screen.getByRole("list", { name: "Requests check-ins" }),
    ).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Maria Popescu"),
      expect.stringContaining("Andreea Ionescu"),
      expect.stringContaining("Ioana Stan"),
    ]);
    expect(rows[2]).toHaveTextContent("Ad-hoc · Requested by you");
    expect(rows[2]).toHaveTextContent(
      'You: "Let\'s look at your first two weeks"',
    );
    expect(
      within(rows[2])
        .getAllByRole("button")
        .map(({ textContent }) => textContent),
    ).toEqual(["Cancel request"]);
    expect(
      screen.getByRole("tab", { name: /^Requests\s*2 waiting on you$/ }),
    ).toBeInTheDocument();
  });

  it("cancels her own request, showing the work in progress, and drops it from Requests", async () => {
    // arrange
    listing = { checkIns: [IOANA_OWN_REQUEST] };
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
          checkInId: IOANA_OWN_REQUEST.id,
        });
      }),
    );
    const { user } = await renderCheckInsPageWithView(
      `${COACH_CHECK_INS_PATH}?view=requests`,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    const busy = await screen.findByRole("button", { name: "Cancelling…" });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    expect(withdrawn).toEqual([{ checkInId: IOANA_OWN_REQUEST.id, body: {} }]);
  });

  it("says her request is no longer waiting when the client answered it first, and reads the check-ins again", async () => {
    // arrange
    listing = { checkIns: [IOANA_OWN_REQUEST] };
    server.use(
      http.post(WITHDRAWAL_URL, () =>
        HttpResponse.json({ error: "not_pending" }, { status: 409 }),
      ),
    );
    const { user } = await renderCheckInsPageWithView(
      `${COACH_CHECK_INS_PATH}?view=requests`,
    );
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

  it("passes the axe checks with requests waiting", async () => {
    // arrange, act
    const { baseElement } = await renderCheckInsPageWithView();

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

describe("where the coach's check-ins page opens", () => {
  it("opens on Requests while a check-in waits for her answer", async () => {
    // arrange, act
    await renderCheckInsPage();

    // assert
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on Upcoming when no check-in waits for her answer", async () => {
    // arrange
    listing = { checkIns: [IOANA_OWN_REQUEST] };

    // act
    await renderCheckInsPage();

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("the coach's check-ins tab in the address", () => {
  it("opens on Past when the address names it", async () => {
    // arrange, act
    await renderCheckInsPageWithView(`${COACH_CHECK_INS_PATH}?view=past`);

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("No past check-ins yet")).toBeInTheDocument();
  });

  it("writes the chosen tab into the address in place, and leaves Requests out of it", async () => {
    // arrange
    const { router, user } = await renderCheckInsPageWithView();

    // act
    await showTab(user, "Upcoming");

    // assert
    expect(router.state.location.search).toBe("?view=upcoming");
    expect(router.state.historyAction).toBe("REPLACE");

    // act
    await showTab(user, /^Requests/);

    // assert
    expect(router.state.location.search).toBe("");
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on Requests when the address names a tab that doesn't exist", async () => {
    // arrange, act
    await renderCheckInsPageWithView(`${COACH_CHECK_INS_PATH}?view=archive`);

    // assert
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("list", { name: "Requests check-ins" }),
    ).toBeInTheDocument();
  });
});

describe("the coach's check-in named in the address", () => {
  it("opens on the tab holding a check-in she was sent to review, scrolled to the centre and focused", async () => {
    // arrange
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    // act
    await renderCheckInsPageWithView(coachCheckInPath(ANDREEA_REQUEST.id));

    // assert
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const row = rowNaming("Andreea Ionescu");
    await waitFor(() => {
      expect(row).toContainElement(document.activeElement as HTMLElement);
    });
    expect(document.activeElement).toHaveTextContent("Andreea Ionescu");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    expect(scrollIntoView.mock.contexts).toContain(document.activeElement);
    scrollIntoView.mockRestore();
  });

  it("opens on Past for a cancelled check-in", async () => {
    // arrange
    listing = { checkIns: [ANDREEA_REQUEST, MARIA_CANCELLED] };

    // act
    await renderCheckInsPageWithView(coachCheckInPath(MARIA_CANCELLED.id));

    // assert
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent("Maria Popescu");
    });
  });

  it("opens as usual, without a word, for a check-in it does not know", async () => {
    // arrange, act
    await renderCheckInsPageWithView(coachCheckInPath(UNKNOWN_CHECK_IN_ID));

    // assert
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(document.activeElement).toBe(document.body);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the tab the address names over the tab holding the check-in", async () => {
    // arrange, act
    await renderCheckInsPageWithView(
      `${coachCheckInPath(ANDREEA_REQUEST.id)}&view=upcoming`,
    );

    // assert
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).toHaveTextContent("Elena Dumitru");
  });
});

describe("the coach's moved check-ins", () => {
  it("shows a client's new time with the earlier time struck through and her note, to accept, decline or answer with another", async () => {
    // arrange
    listing = { checkIns: [ANDREEA_NEW_TIME] };
    const user = await renderCheckInsPage();
    const row = rowNaming("Andreea Ionescu");
    const menu = "More actions for the check-in on Fri, Oct 16 at 4:00 PM";

    // act
    await user.click(within(row).getByRole("button", { name: menu }));

    // assert
    expect(row).toHaveTextContent("Ad-hoc · New time from Andreea");
    expect(row.querySelector("s")).toHaveTextContent("Fri, Oct 16 · 10:00 AM");
    expect(row).toHaveTextContent(
      'Andreea: "I have a work call that morning. Could we meet on Friday afternoon?"',
    );
    expect(
      within(row)
        .getAllByRole("button")
        .map(
          (button) => button.getAttribute("aria-label") ?? button.textContent,
        ),
    ).toEqual(["Decline", "Accept", menu]);
    expect(
      within(await screen.findByRole("menu"))
        .getAllByRole("menuitem")
        .map(({ textContent }) => textContent),
    ).toEqual(["Reschedule"]);
  });

  it("holds back Reschedule on a check-in moved twice, explaining why on hover", async () => {
    // arrange
    listing = { checkIns: [ELENA_MOVED_TWICE] };
    const user = await renderCheckInsPage();
    await showTab(user, "Upcoming");
    await user.click(screen.getByRole("button", { name: ELENA_MENU }));
    const reschedule = within(await screen.findByRole("menu")).getByRole(
      "menuitem",
      { name: "Reschedule" },
    );

    // act
    await user.hover(reschedule);

    // assert
    expect(reschedule).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText(MOVED_TWICE_REASON)).toBeInTheDocument();
  });
});

describe("the coach's upcoming check-in menu", () => {
  it("proposes a new time from the open times of that client, with a note named for her", async () => {
    // arrange
    listing = { checkIns: [ELENA_CANCELLABLE] };
    const asked: (string | null)[] = [];
    const proposals: { checkInId: string; body: unknown }[] = [];
    server.use(
      http.get(OPEN_TIMES_URL, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get("clientId"));
        return HttpResponse.json({
          times: [THURSDAY_AFTERNOON, THURSDAY_EVENING],
        });
      }),
      http.post(NEW_TIME_URL, async ({ params, request }) => {
        proposals.push({
          checkInId: String(params.checkInId),
          body: await request.json(),
        });
        return HttpResponse.json({
          status: "proposed",
          checkInId: ELENA_CANCELLABLE.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Upcoming");
    await user.click(screen.getByRole("button", { name: ELENA_MENU }));
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
        name: "Add a note for Elena (optional)",
      }),
      "I'm travelling that morning",
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Propose 6:00 PM" }),
    );

    // assert
    expect(await screen.findByText("New time proposed")).toBeInTheDocument();
    expect(asked).toEqual([ELENA_ID]);
    expect(proposals).toEqual([
      {
        checkInId: ELENA_CANCELLABLE.id,
        body: {
          note: "I'm travelling that morning",
          startsAt: THURSDAY_EVENING,
        },
      },
    ]);
  });

  it("cancels an upcoming check-in once she confirms, naming the client", async () => {
    // arrange
    listing = { checkIns: [ELENA_CANCELLABLE] };
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
              ...ELENA_CANCELLABLE,
              status: "cancelled",
              tab: "past",
              viewerProposal: "none",
              viewerMayCancel: false,
            },
          ],
        };
        return HttpResponse.json({
          status: "cancelled",
          checkInId: ELENA_CANCELLABLE.id,
        });
      }),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Upcoming");
    await user.click(screen.getByRole("button", { name: ELENA_MENU }));
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Cancel",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this check-in?",
    });
    const question = dialog.textContent;

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(question).toContain("Tue, Oct 13 at 10:00 AM with Elena Dumitru.");
    expect(
      await screen.findByText("Cancelled check-in with Elena Dumitru"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No upcoming check-ins"),
    ).toBeInTheDocument();
    expect(cancellations).toEqual([
      { checkInId: ELENA_CANCELLABLE.id, body: {} },
    ]);
  });

  it("says the check-in is no longer upcoming when the client cancelled it first, and reads the check-ins again", async () => {
    // arrange
    listing = { checkIns: [ELENA_CANCELLABLE] };
    server.use(
      http.post(CANCELLATION_URL, () =>
        HttpResponse.json({ error: "not_pending" }, { status: 409 }),
      ),
    );
    const user = await renderCheckInsPage();
    await showTab(user, "Upcoming");
    await user.click(screen.getByRole("button", { name: ELENA_MENU }));
    await user.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Cancel",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Cancel this check-in?",
    });
    const readsBefore = listingReads;

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(
      await screen.findByText("This check-in is no longer upcoming."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listingReads).toBeGreaterThan(readsBefore);
    });
  });

  it("passes the axe checks with the menu open", async () => {
    // arrange
    listing = { checkIns: [ELENA_CANCELLABLE] };
    const { baseElement, user } = await renderCheckInsPageWithView();
    await showTab(user, "Upcoming");
    await user.click(screen.getByRole("button", { name: ELENA_MENU }));
    await screen.findByRole("menu");

    // act
    const results = await axeWithMenuOpen(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("a weekly check-in on the coach's check-ins page", () => {
  it("lists a week whose hour is taken first under Requests, counted, marked Clash and found a new time from its menu", async () => {
    // arrange
    listing = { checkIns: [ANDREEA_REQUEST, ELENA_CLASH, ELENA_NEXT_WEEKLY] };
    const user = await renderCheckInsPage();
    const rows = within(
      screen.getByRole("list", { name: "Requests check-ins" }),
    ).getAllByRole("listitem");

    // act
    await user.click(
      within(rows[1]).getByRole("button", { name: ELENA_CLASH_MENU }),
    );

    // assert
    expect(
      screen.getByRole("tab", { name: /^Requests\s*2 waiting on you$/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByText("Elena Dumitru")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Clash")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("Finding a new time");
    expect(
      within(rows[1]).queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      within(rows[1]).queryByRole("button", { name: "Decline" }),
    ).not.toBeInTheDocument();
    expect(
      within(await screen.findByRole("menu"))
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Reschedule", "Cancel"]);
  });

  it("keeps the next weekly check-in under Upcoming beside a clash, read without a kind or who asked", async () => {
    // arrange
    listing = { checkIns: [ELENA_CLASH, ELENA_NEXT_WEEKLY] };
    const user = await renderCheckInsPage();

    // act
    await showTab(user, "Upcoming");

    // assert
    const row = within(
      await screen.findByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Wed, Oct 14");
    expect(row).not.toHaveTextContent("Requested by");
    expect(row).not.toHaveTextContent("Ad-hoc");
    expect(within(row).queryByText("Clash")).not.toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Join Meet" })).toBeVisible();
  });

  it("passes the axe checks with a clash under Requests", async () => {
    // arrange
    listing = { checkIns: [ELENA_CLASH] };
    const { baseElement } = await renderCheckInsPageWithView();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

function rowNaming(name: string): HTMLElement {
  const row = screen.getByText(name).closest("li");

  if (!row) throw new Error(`No check-in row names ${name}`);

  return row;
}

async function showTab(user: UserEvent, name: string | RegExp): Promise<void> {
  await user.click(screen.getByRole("tab", { name }));
  await screen.findByRole("tab", { name, selected: true });
}

async function renderCheckInsPage() {
  const { user } = await renderCheckInsPageWithView();

  return user;
}

async function renderCheckInsPageWithView(entry = COACH_CHECK_INS_PATH) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Coach portal content">
            <CoachCheckInsRoute />
          </main>
        ),
        loader: () => {
          listingReads += 1;
          return listing;
        },
        path: COACH_CHECK_INS_PATH,
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
        action: frameworkModeAction(withdrawCheckIn),
        path: CHECK_INS_API_PATHS.withdrawal,
      },
      {
        loader: frameworkModeLoader(openTimesLoader),
        path: CHECK_INS_API_PATHS.openTimes,
        shouldRevalidate: shouldRevalidateOpenTimes,
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
