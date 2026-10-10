// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  act,
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

import {
  clientLoader as openTimesLoader,
  shouldRevalidate as shouldRevalidateOpenTimes,
} from "~/features/check-ins/api/shared/open-times";
import { clientAction as requestCheckIn } from "~/features/check-ins/api/client/requests";
import { clientAction as withdrawCheckIn } from "~/features/check-ins/api/shared/withdrawal";
import type { ClientCheckIns } from "~/features/check-ins/public/check-ins";
import {
  CHECK_INS_API_PATHS,
  CLIENT_CHECK_INS_PATH,
} from "~/features/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/server/test-support/framework-mode-action";

import ClientCheckInsRoute from "./check-ins-page";

type ClientCheckIn = ClientCheckIns["checkIns"][number];

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";

const APPROVED_SOON: ClientCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "ad_hoc",
  status: "approved",
  initiatedBy: "client",
  awaitsViewer: false,
  viewerMayWithdraw: false,
  isWaitingRequest: false,
  startsAt: "2026-10-14T07:00:00.000Z",
  endsAt: "2026-10-14T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T06:50:00.000Z",
  note: null,
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
  viewerMayWithdraw: true,
  isWaitingRequest: true,
  startsAt: "2026-10-16T09:00:00.000Z",
  endsAt: "2026-10-16T10:00:00.000Z",
  joinEmphasisFrom: "2026-10-16T08:50:00.000Z",
  note: "Can we look at my squat form?",
};

const PASSED: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f7a",
  status: "passed",
  startsAt: "2026-10-05T07:00:00.000Z",
  endsAt: "2026-10-05T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-05T06:50:00.000Z",
};

const CANCELLED: ClientCheckIn = {
  ...APPROVED_SOON,
  id: "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a8b",
  status: "cancelled",
  startsAt: "2026-10-08T13:00:00.000Z",
  endsAt: "2026-10-08T14:00:00.000Z",
  joinEmphasisFrom: "2026-10-08T12:50:00.000Z",
  note: "Wanted to talk through travel week",
};

const THURSDAY_AFTERNOON = "2026-10-15T14:00:00.000Z";
const THURSDAY_EVENING = "2026-10-15T15:00:00.000Z";
const FRIDAY_AFTERNOON = "2026-10-16T14:00:00.000Z";
const OPEN_TIMES = [THURSDAY_AFTERNOON, THURSDAY_EVENING, FRIDAY_AFTERNOON];

const WAITING_REASON =
  "You can send another request once this one is answered.";

const OPEN_TIMES_URL = `*${CHECK_INS_API_PATHS.openTimes}`;
const REQUESTS_URL = `*${CHECK_INS_API_PATHS.requests}`;
const WITHDRAWAL_URL = `*${CHECK_INS_API_PATHS.withdrawal}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

let listing: ClientCheckIns;
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
      screen.getByText("Request a check-in and look back at past sessions."),
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
    await user.click(screen.getByRole("tab", { name: "Requests" }));

    // assert
    const row = within(
      screen.getByRole("list", { name: "Requests check-ins" }),
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
    await user.click(screen.getByRole("tab", { name: "Past" }));

    // assert
    const rows = within(
      screen.getByRole("list", { name: "Past check-ins" }),
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
    ["Requests", "No open requests", "Requests you send show up here."],
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
    await user.click(screen.getByRole("tab", { name: tab }));

    // assert
    expect(screen.getByText(title)).toBeInTheDocument();
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
        name: "Add a note for your coach (optional)",
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
        name: "Add a note for your coach (optional)",
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
        name: "Add a note for your coach (optional)",
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
    await user.click(screen.getByRole("tab", { name: "Requests" }));

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
    const withdrawn: string[] = [];
    server.use(
      http.post(WITHDRAWAL_URL, async ({ params }) => {
        withdrawn.push(String(params.checkInId));
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
    await user.click(screen.getByRole("tab", { name: "Requests" }));

    // act
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    const busy = await screen.findByRole("button", { name: "Cancelling…" });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    expect(await screen.findByText("No open requests")).toBeInTheDocument();
    expect(withdrawn).toEqual([WAITING_REQUEST.id]);
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
    await user.click(screen.getByRole("tab", { name: "Requests" }));
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
    await user.click(screen.getByRole("tab", { name: "Requests" }));

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
          <main aria-label="Client portal content">
            <ClientCheckInsRoute />
          </main>
        ),
        loader: () => {
          listingReads += 1;
          return listing;
        },
        path: CLIENT_CHECK_INS_PATH,
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
    ],
    { initialEntries: [CLIENT_CHECK_INS_PATH] },
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
