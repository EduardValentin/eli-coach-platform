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

import { clientAction as approveCheckIn } from "~/features/check-ins/api/coach/approval";
import { clientAction as declineCheckIn } from "~/features/check-ins/api/coach/decline";
import type {
  CoachCheckIn,
  CoachCheckIns,
} from "~/features/check-ins/public/check-ins";
import {
  CHECK_INS_API_PATHS,
  COACH_CHECK_INS_PATH,
} from "~/features/check-ins/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import CoachCheckInsRoute from "./check-ins-page";

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";

const ANDREEA_REQUEST: CoachCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "ad_hoc",
  status: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  startsAt: "2026-10-16T09:00:00.000Z",
  endsAt: "2026-10-16T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T08:50:00.000Z",
  note: "I have some questions about my macros",
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
};

const ELENA_UPCOMING: CoachCheckIn = {
  ...ANDREEA_REQUEST,
  id: "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  status: "approved",
  startsAt: "2026-10-13T07:00:00.000Z",
  endsAt: "2026-10-13T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-13T06:50:00.000Z",
  note: null,
  client: { firstName: "Elena", lastName: "Dumitru" },
};

const APPROVAL_URL = `*${CHECK_INS_API_PATHS.approval}`;
const DECLINE_URL = `*${CHECK_INS_API_PATHS.decline}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

let listing: CoachCheckIns;
let listingReads = 0;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
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

  it("offers Join Meet on her upcoming check-ins", async () => {
    // arrange
    const user = await renderCheckInsPage();

    // act
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    // assert
    const row = within(
      screen.getByRole("list", { name: "Upcoming check-ins" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Elena Dumitru");
    expect(
      within(row).getByRole("link", { name: "Join Meet" }),
    ).toHaveAttribute("href", `/coach/checkins/${ELENA_UPCOMING.id}/join`);
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
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
      "Requests from your clients show up here.",
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
    await user.click(screen.getByRole("tab", { name: tab }));

    // assert
    expect(screen.getByText(title)).toBeInTheDocument();
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
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(
      within(
        screen.getByRole("list", { name: "Upcoming check-ins" }),
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

  it("passes the axe checks with requests waiting", async () => {
    // arrange, act
    const { baseElement } = await renderCheckInsPageWithView();

    // assert
    expect((await axe(baseElement)).violations).toEqual([]);
  });
});

function rowNaming(name: string): HTMLElement {
  const row = screen.getByText(name).closest("li");

  if (!row) throw new Error(`No check-in row names ${name}`);

  return row;
}

async function renderCheckInsPage() {
  const { user } = await renderCheckInsPageWithView();

  return user;
}

async function renderCheckInsPageWithView() {
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
    ],
    { initialEntries: [COACH_CHECK_INS_PATH] },
  );

  const view = render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Check-ins" });

  return { ...view, user };
}
