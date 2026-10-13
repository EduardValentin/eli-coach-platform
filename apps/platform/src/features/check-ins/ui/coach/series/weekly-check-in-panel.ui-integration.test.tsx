// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import type { Weekday } from "@eli-coach-platform/domain/coach-availability";
import { Toaster } from "@eli-coach-platform/ui/toast";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
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

import { clientAction as setUpSeries } from "~/features/check-ins/api/coach/series";
import { clientAction as changeSeries } from "~/features/check-ins/api/coach/series-change";
import {
  clientLoader as seriesPreviewLoader,
  shouldRevalidate as shouldRevalidateSeriesPreview,
} from "~/features/check-ins/api/coach/series-preview";
import { clientAction as stopSeries } from "~/features/check-ins/api/coach/series-stop";
import { clientAction as cancelCheckIn } from "~/features/check-ins/api/shared/cancellation";
import type {
  CheckInScheduling,
  CoachCheckIn,
  CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/server/test-support/framework-mode-action";

import { WeeklyCheckInPanel } from "./weekly-check-in-panel";

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const SERIES_ID = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
const CLIENT_PAGE_PATH = `/coach/clients/${CLIENT_ID}`;

const SET_UP_TITLE = "Set up a weekly check-in with Ana";
const CHANGE_TITLE = "Change the weekly check-in";
const STOP_TITLE = "Stop the weekly check-in?";
const AWAITING_REASON =
  "She can answer a check-in once she has sent her onboarding.";

const SERIES_URL = `*${CHECK_INS_API_PATHS.series}`;
const SERIES_PREVIEW_URL = `*${CHECK_INS_API_PATHS.seriesPreview}`;
const SERIES_CHANGE_URL = `*${CHECK_INS_API_PATHS.seriesChange}`;
const SERIES_STOP_URL = `*${CHECK_INS_API_PATHS.seriesStop}`;
const CANCELLATION_URL = `*${CHECK_INS_API_PATHS.cancellation}`;

const FIRST_WEEK: CoachCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  seriesId: SERIES_ID,
  kind: "recurring",
  status: "approved",
  tab: "upcoming",
  initiatedBy: "coach",
  proposedBy: "coach",
  awaitsViewer: false,
  viewerMayWithdraw: false,
  viewerProposal: "allowed",
  viewerMayCancel: true,
  newTimeWaits: false,
  isWaitingRequest: false,
  startsAt: "2026-10-14T15:00:00.000Z",
  endsAt: "2026-10-14T16:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T14:50:00.000Z",
  earlierStartsAt: null,
  moves: 0,
  note: null,
  newTimeNote: null,
  clientId: CLIENT_ID,
  client: { firstName: "Ana", lastName: "Popescu" },
};

const CLASHING_WEEK: CoachCheckIn = {
  ...FIRST_WEEK,
  id: "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  status: "clash",
  tab: "requests",
  awaitsViewer: true,
  startsAt: "2026-10-21T15:00:00.000Z",
  endsAt: "2026-10-21T16:00:00.000Z",
  joinEmphasisFrom: "2026-10-21T14:50:00.000Z",
};

const LAST_WEEK: CoachCheckIn = {
  ...FIRST_WEEK,
  id: "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
  startsAt: "2026-10-28T16:00:00.000Z",
  endsAt: "2026-10-28T17:00:00.000Z",
  joinEmphasisFrom: "2026-10-28T15:50:00.000Z",
};

const SERIES = {
  id: SERIES_ID,
  weekday: "wednesday",
  hour: 18,
  timeZone: TIME_ZONE,
} as const;

const NO_SERIES: CoachClientSeriesPanel = { series: null, weeks: [] };

const ACTIVE: CoachClientSeriesPanel = {
  series: SERIES,
  weeks: [FIRST_WEEK, LAST_WEEK],
};

const WITH_CLASH: CoachClientSeriesPanel = {
  series: SERIES,
  weeks: [FIRST_WEEK, CLASHING_WEEK, LAST_WEEK],
};

const NO_WEEKS_LEFT: CoachClientSeriesPanel = { series: SERIES, weeks: [] };

const FIRST_WEEK_MENU =
  "More actions for the check-in on Wed, Oct 14 at 6:00 PM";
const CLASHING_WEEK_MENU =
  "More actions for the check-in on Wed, Oct 21 at 6:00 PM";

const PREVIEW = {
  weekdays: ["wednesday", "monday", "friday"],
  hours: [
    { hour: 17, weeks: 12, clashes: 0 },
    { hour: 18, weeks: 12, clashes: 2 },
    { hour: 19, weeks: 12, clashes: 1 },
  ],
};

type PanelRendering = {
  gender?: VisitorGender;
  scheduling?: CheckInScheduling;
  suggestedWeekday?: Weekday | null;
};

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

let weekly: CoachClientSeriesPanel;

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
  weekly = NO_SERIES;
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

describe("the weekly check-in panel on a client record", () => {
  it("offers Set up while she has no weekly check-in, as when the panel could not be read", async () => {
    // arrange, act
    await renderPanel();

    // assert
    const panel = weeklyPanel();
    expect(
      within(panel).getByRole("heading", { level: 2, name: "Weekly check-in" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("No weekly check-in yet."),
    ).toBeInTheDocument();
    expect(setUpButton()).not.toHaveAttribute("aria-disabled");
    expect(
      within(panel).queryByRole("list", { name: "Weeks to come" }),
    ).not.toBeInTheDocument();
  });

  it("holds Set up back before she sends her onboarding and says why on hover", async () => {
    // arrange
    const user = await renderPanel({ scheduling: "awaiting_onboarding" });

    // act
    await user.hover(setUpButton());

    // assert
    expect(setUpButton()).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText(AWAITING_REASON)).toBeVisible();
    expect(setUpButton()).toHaveAccessibleDescription(AWAITING_REASON);
  });

  it("explains why Set up is held back on a tap, without opening the dialog", async () => {
    // arrange
    const user = await renderPanel({ scheduling: "awaiting_onboarding" });

    // act
    await user.pointer({ keys: "[TouchA]", target: setUpButton() });

    // assert
    expect(await screen.findByText(AWAITING_REASON)).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: SET_UP_TITLE }),
    ).not.toBeInTheDocument();
  });

  it("offers nothing once her coaching has ended", async () => {
    // arrange
    weekly = ACTIVE;

    // act
    await renderPanel({ scheduling: "ended" });

    // assert
    const panel = weeklyPanel();
    expect(
      within(panel).getByText("No weekly check-in yet."),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("list", { name: "Weeks to come" }),
    ).not.toBeInTheDocument();
  });

  it("reads the day and hour in the coach's zone and lists every week still to come", async () => {
    // arrange
    weekly = ACTIVE;

    // act
    await renderPanel();

    // assert
    const panel = weeklyPanel();
    expect(
      within(panel).getByText("Every Wednesday at 18:00"),
    ).toBeInTheDocument();
    const weeks = within(
      within(panel).getByRole("list", { name: "Weeks to come" }),
    ).getAllByRole("listitem");
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toHaveTextContent("Wed, Oct 14");
    expect(weeks[0]).toHaveTextContent("Ana Popescu");
    expect(weeks[1]).toHaveTextContent("Wed, Oct 28");
    expect(
      within(panel)
        .getAllByRole("button")
        .map(
          (button) => button.textContent || button.getAttribute("aria-label"),
        ),
    ).toEqual([
      "Change",
      "Stop",
      FIRST_WEEK_MENU,
      "More actions for the check-in on Wed, Oct 28 at 6:00 PM",
    ]);
    expect(
      within(panel).queryByRole("link", { name: "Join Meet" }),
    ).not.toBeInTheDocument();
  });

  it("flags a week whose hour is taken and lets the coach reschedule or cancel it", async () => {
    // arrange
    weekly = WITH_CLASH;
    const user = await renderPanel();
    const weeks = within(
      screen.getByRole("list", { name: "Weeks to come" }),
    ).getAllByRole("listitem");

    // act
    await user.click(
      within(weeks[1]).getByRole("button", { name: CLASHING_WEEK_MENU }),
    );

    // assert
    expect(within(weeks[1]).getByText("Clash")).toBeInTheDocument();
    expect(weeks[1]).toHaveTextContent("Finding a new time");
    expect(within(weeks[0]).queryByText("Clash")).not.toBeInTheDocument();
    expect(
      within(await screen.findByRole("menu"))
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Reschedule", "Cancel"]);
  });

  it("says so when no week is left to come", async () => {
    // arrange
    weekly = NO_WEEKS_LEFT;

    // act
    await renderPanel();

    // assert
    expect(
      within(weeklyPanel()).getByText("No weeks to come."),
    ).toBeInTheDocument();
  });

  it("cancels one week once the coach confirms, naming the client", async () => {
    // arrange
    weekly = ACTIVE;
    const cancelled: string[] = [];
    server.use(
      http.post(CANCELLATION_URL, ({ params }) => {
        cancelled.push(String(params.checkInId));
        weekly = { series: SERIES, weeks: [LAST_WEEK] };
        return HttpResponse.json({
          status: "cancelled",
          checkInId: FIRST_WEEK.id,
        });
      }),
    );
    const user = await renderPanel();
    await user.click(screen.getByRole("button", { name: FIRST_WEEK_MENU }));
    await user.click(await screen.findByRole("menuitem", { name: "Cancel" }));
    const confirm = await screen.findByRole("dialog", {
      name: "Cancel this check-in?",
    });

    // act
    await user.click(
      within(confirm).getByRole("button", { name: "Cancel check-in" }),
    );

    // assert
    expect(confirm).toHaveTextContent(
      "Wed, Oct 14 at 6:00 PM with Ana Popescu.",
    );
    expect(
      await screen.findByText("Cancelled check-in with Ana Popescu"),
    ).toBeInTheDocument();
    expect(cancelled).toEqual([FIRST_WEEK.id]);
    await waitFor(() => {
      expect(
        within(
          screen.getByRole("list", { name: "Weeks to come" }),
        ).getAllByRole("listitem"),
      ).toHaveLength(1);
    });
  });

  it("passes the axe checks with a clash among the weeks", async () => {
    // arrange
    weekly = WITH_CLASH;
    const { baseElement } = await renderPanelWithView();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("setting up a weekly check-in", () => {
  it("opens on its title, prefills her onboarding day and counts the weeks that would clash at each hour", async () => {
    // arrange
    const asked = answerPreview();
    const user = await renderPanel({ suggestedWeekday: "wednesday" });

    // act
    await user.click(setUpButton());
    const dialog = await screen.findByRole("dialog", { name: SET_UP_TITLE });
    const focusOnOpen = document.activeElement;
    const hours = await hourList(dialog);

    // assert
    expect(focusOnOpen).toBe(
      within(dialog).getByRole("heading", { level: 3, name: SET_UP_TITLE }),
    );
    expect(dialog).toHaveTextContent(
      "Pick the day and hour. Every week until her paid period ends is booked.",
    );
    const days = within(dialog).getByRole("radiogroup", { name: "Day" });
    expect(
      within(days)
        .getAllByRole("radio")
        .map((day) => [day.getAttribute("aria-label"), day.textContent]),
    ).toEqual([
      ["Monday", "Mon"],
      ["Wednesday", "Wed"],
      ["Friday", "Fri"],
    ]);
    expect(
      within(days).getByRole("radio", { name: "Wednesday" }),
    ).toBeChecked();
    expect(
      within(hours)
        .getAllByRole("button")
        .map((hour) => hour.textContent),
    ).toEqual(["17:00", "18:002 clashes", "19:001 clash"]);
    expect(asked).toEqual([{ clientId: CLIENT_ID, weekday: "wednesday" }]);
    expect(stepButton(dialog)).toBeDisabled();
  });

  it("opens on the first offered day when her onboarding day is not one of them", async () => {
    // arrange
    const asked = answerPreview();
    const user = await renderPanel({ suggestedWeekday: "sunday" });

    // act
    await user.click(setUpButton());
    const dialog = await screen.findByRole("dialog", { name: SET_UP_TITLE });
    await hourList(dialog);

    // assert
    expect(within(dialog).getByRole("radio", { name: "Monday" })).toBeChecked();
    expect(asked.at(-1)).toEqual({ clientId: CLIENT_ID, weekday: "monday" });
  });

  it("reads the hours again for another day", async () => {
    // arrange
    const asked = answerPreview();
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    await user.click(setUpButton());
    const dialog = await screen.findByRole("dialog", { name: SET_UP_TITLE });
    await hourList(dialog);

    // act
    await user.click(within(dialog).getByRole("radio", { name: "Friday" }));

    // assert
    await waitFor(() => {
      expect(asked.at(-1)).toEqual({ clientId: CLIENT_ID, weekday: "friday" });
    });
    expect(within(dialog).getByRole("radio", { name: "Friday" })).toBeChecked();
    expect(await hourList(dialog)).toBeInTheDocument();
  });

  it("books every week, says so and lists them on the panel, with focus back on the panel's action", async () => {
    // arrange
    answerPreview();
    const setUps = answerSetUp(() => {
      weekly = ACTIVE;
      return HttpResponse.json(
        { status: "set_up", seriesId: SERIES_ID },
        { status: 201 },
      );
    });
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    const dialog = await openSetUpOnSixPm(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(
      await screen.findByText("Weekly check-in set up"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(setUps).toEqual([
      { clientId: CLIENT_ID, weekday: "wednesday", hour: 18 },
    ]);
    expect(
      within(weeklyPanel()).getByText("Every Wednesday at 18:00"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toHaveFocus();
  });

  it("shows the setting up under way and holds the dialog until the server answers", async () => {
    // arrange
    answerPreview();
    let release: () => void = () => {};
    answerSetUp(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return HttpResponse.json(
        { status: "set_up", seriesId: SERIES_ID },
        { status: 201 },
      );
    });
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    const dialog = await openSetUpOnSixPm(user);

    // act
    await user.click(stepButton(dialog));
    const busy = await within(dialog).findByRole("button", {
      name: "Setting up…",
    });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    await user.keyboard("{Escape}");
    const stillOpen = screen.queryByRole("dialog", { name: SET_UP_TITLE });
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(stillOpen).toBeInTheDocument();
    expect(
      await screen.findByText("Weekly check-in set up"),
    ).toBeInTheDocument();
  });

  it.each([
    ["series_exists", "A weekly check-in already exists."],
    ["outside_availability", "Pick a day and hour inside your availability."],
    ["nothing_to_create", "Her paid period has no week left to book."],
    ["client_cannot_answer", "Ana can't have a weekly check-in right now."],
  ])("says why it was refused with %s", async (error, copy) => {
    // arrange
    answerPreview();
    answerSetUp(() => HttpResponse.json({ error }, { status: 409 }));
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    const dialog = await openSetUpOnSixPm(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(copy);
    expect(stepButton(dialog)).toHaveTextContent("Set up");
  });

  it("words the refusal for a client who is male", async () => {
    // arrange
    answerPreview();
    answerSetUp(() =>
      HttpResponse.json({ error: "nothing_to_create" }, { status: 409 }),
    );
    const user = await renderPanel({
      gender: "male",
      suggestedWeekday: "wednesday",
    });
    const dialog = await openSetUpOnSixPm(
      user,
      "Set up a weekly check-in with Ana",
    );

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(dialog).toHaveTextContent(
      "Pick the day and hour. Every week until his paid period ends is booked.",
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "His paid period has no week left to book.",
    );
  });

  it("asks to try again when setting up fails", async () => {
    // arrange
    answerPreview();
    answerSetUp(
      () => new HttpResponse("Internal Server Error", { status: 500 }),
    );
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    const dialog = await openSetUpOnSixPm(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The weekly check-in wasn't saved. Try again.",
    );
  });

  it("offers to try again when the hours cannot be read, then lists them", async () => {
    // arrange
    let reads = 0;
    server.use(
      http.get(SERIES_PREVIEW_URL, () => {
        reads += 1;
        return reads === 1
          ? new HttpResponse("Internal Server Error", { status: 500 })
          : HttpResponse.json(PREVIEW);
      }),
    );
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    await user.click(setUpButton());
    const dialog = await screen.findByRole("dialog", { name: SET_UP_TITLE });
    const problem = await within(dialog).findByRole("alert");

    // act
    await user.click(
      within(problem).getByRole("button", { name: "Try again" }),
    );

    // assert
    expect(problem).toHaveTextContent("We couldn't load the hours just now.");
    expect(await hourList(dialog)).toBeInTheDocument();
    expect(reads).toBe(2);
  });

  it("can be reached and dismissed by keyboard, handing focus back to Set up", async () => {
    // arrange
    answerPreview();
    const user = await renderPanel({ suggestedWeekday: "wednesday" });
    setUpButton().focus();

    // act
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: SET_UP_TITLE });
    await hourList(dialog);
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(setUpButton()).toHaveFocus();
  });

  it("passes the axe checks with the dialog open", async () => {
    // arrange
    answerPreview();
    const { baseElement, user } = await renderPanelWithView({
      suggestedWeekday: "wednesday",
    });
    await openSetUpOnSixPm(user);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

describe("changing a weekly check-in", () => {
  it("opens on the weekly check-in's day and moves every week to come to the new day and hour", async () => {
    // arrange
    weekly = ACTIVE;
    answerPreview();
    const changes: { seriesId: string; body: unknown }[] = [];
    server.use(
      http.put(SERIES_CHANGE_URL, async ({ params, request }) => {
        changes.push({
          seriesId: String(params.seriesId),
          body: await request.json(),
        });
        weekly = {
          series: { ...SERIES, weekday: "friday", hour: 19 },
          weeks: [],
        };
        return HttpResponse.json({ status: "changed", seriesId: SERIES_ID });
      }),
    );
    const user = await renderPanel();
    await user.click(screen.getByRole("button", { name: "Change" }));
    const dialog = await screen.findByRole("dialog", { name: CHANGE_TITLE });
    await hourList(dialog);
    const preselected = within(dialog).getByRole("radio", {
      name: "Wednesday",
    });
    const preselectedChecked = preselected.getAttribute("aria-checked");

    // act
    await user.click(within(dialog).getByRole("radio", { name: "Friday" }));
    await user.click(
      within(await hourList(dialog)).getByRole("button", {
        name: /^19:00/,
      }),
    );
    await user.click(stepButton(dialog));

    // assert
    expect(preselectedChecked).toBe("true");
    expect(dialog).toHaveTextContent(
      "Every week from the next Friday is moved.",
    );
    expect(
      await screen.findByText("Weekly check-in changed"),
    ).toBeInTheDocument();
    expect(changes).toEqual([
      { seriesId: SERIES_ID, body: { weekday: "friday", hour: 19 } },
    ]);
    expect(
      await within(weeklyPanel()).findByText("Every Friday at 19:00"),
    ).toBeInTheDocument();
  });

  it("says the weekly check-in changed meanwhile and reads the hours again", async () => {
    // arrange
    weekly = ACTIVE;
    const asked = answerPreview();
    server.use(
      http.put(SERIES_CHANGE_URL, () =>
        HttpResponse.json({ error: "changed_meanwhile" }, { status: 409 }),
      ),
    );
    const user = await renderPanel();
    await user.click(screen.getByRole("button", { name: "Change" }));
    const dialog = await screen.findByRole("dialog", { name: CHANGE_TITLE });
    await user.click(
      within(await hourList(dialog)).getByRole("button", { name: /^18:00/ }),
    );

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The weekly check-in changed meanwhile.",
    );
    await waitFor(() => {
      expect(asked).toHaveLength(2);
    });
  });
});

describe("stopping a weekly check-in", () => {
  it("keeps the weekly check-in when the coach keeps it, handing focus back to Stop", async () => {
    // arrange
    weekly = ACTIVE;
    const stops = answerStop(() =>
      HttpResponse.json({ status: "stopped", seriesId: SERIES_ID }),
    );
    const user = await renderPanel();
    await user.click(stopButton());
    const confirm = await screen.findByRole("dialog", { name: STOP_TITLE });

    // act
    await user.click(within(confirm).getByRole("button", { name: "Keep" }));

    // assert
    expect(confirm).toHaveTextContent(
      "Every week still to come is cancelled and Ana is told.",
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(stopButton()).toHaveFocus();
    expect(stops).toEqual([]);
  });

  it("asks before stopping, then cancels every week to come and offers Set up again", async () => {
    // arrange
    weekly = ACTIVE;
    const stops = answerStop(() => {
      weekly = NO_SERIES;
      return HttpResponse.json({ status: "stopped", seriesId: SERIES_ID });
    });
    const user = await renderPanel();
    await user.click(stopButton());
    const confirm = await screen.findByRole("dialog", { name: STOP_TITLE });

    // act
    await user.click(within(confirm).getByRole("button", { name: "Stop" }));

    // assert
    expect(
      await screen.findByText("Weekly check-in stopped"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(stops).toEqual([SERIES_ID]);
    expect(
      within(weeklyPanel()).getByText("No weekly check-in yet."),
    ).toBeInTheDocument();
    expect(setUpButton()).toHaveFocus();
  });

  it.each([
    [
      "the weekly check-in changed meanwhile",
      () => HttpResponse.json({ error: "changed_meanwhile" }, { status: 409 }),
      "The weekly check-in changed meanwhile.",
    ],
    [
      "stopping fails",
      () => new HttpResponse("Internal Server Error", { status: 500 }),
      "The weekly check-in wasn't stopped. Try again.",
    ],
  ])("says so when %s", async (_case, answer, copy) => {
    // arrange
    weekly = ACTIVE;
    answerStop(answer);
    const user = await renderPanel();
    await user.click(stopButton());
    const confirm = await screen.findByRole("dialog", { name: STOP_TITLE });

    // act
    await user.click(within(confirm).getByRole("button", { name: "Stop" }));

    // assert
    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(
      within(weeklyPanel()).getByText("Every Wednesday at 18:00"),
    ).toBeInTheDocument();
  });

  it("passes the axe checks while asking", async () => {
    // arrange
    weekly = ACTIVE;
    const { baseElement, user } = await renderPanelWithView();
    await user.click(stopButton());
    await screen.findByRole("dialog", { name: STOP_TITLE });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

function answerPreview(): unknown[] {
  const asked: unknown[] = [];
  server.use(
    http.get(SERIES_PREVIEW_URL, ({ request }) => {
      asked.push(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json(PREVIEW);
    }),
  );

  return asked;
}

function answerSetUp(answer: () => Response | Promise<Response>): unknown[] {
  const received: unknown[] = [];
  server.use(
    http.post(SERIES_URL, async ({ request }) => {
      received.push(await request.json());
      return answer();
    }),
  );

  return received;
}

function answerStop(answer: () => Response): string[] {
  const stopped: string[] = [];
  server.use(
    http.post(SERIES_STOP_URL, ({ params }) => {
      stopped.push(String(params.seriesId));
      return answer();
    }),
  );

  return stopped;
}

async function openSetUpOnSixPm(
  user: UserEvent,
  title = SET_UP_TITLE,
): Promise<HTMLElement> {
  await user.click(setUpButton());
  const dialog = await screen.findByRole("dialog", { name: title });
  await user.click(
    within(await hourList(dialog)).getByRole("button", { name: /^18:00/ }),
  );

  return dialog;
}

function hourList(dialog: HTMLElement): Promise<HTMLElement> {
  return within(dialog).findByRole("list", { name: "Hour" });
}

function weeklyPanel(): HTMLElement {
  return screen.getByRole("region", { name: "Weekly check-in" });
}

function setUpButton(): HTMLElement {
  return screen.getByRole("button", { name: "Set up" });
}

function stopButton(): HTMLElement {
  return within(weeklyPanel()).getByRole("button", { name: "Stop" });
}

function stepButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("button", {
    name: /^(Set up|Setting up…|Change|Changing…)$/,
  });
}

async function renderPanel(options: PanelRendering = {}) {
  const { user } = await renderPanelWithView(options);

  return user;
}

async function renderPanelWithView({
  gender = "female",
  scheduling = "allowed",
  suggestedWeekday = null,
}: PanelRendering = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Coach portal content">
            <h1>Ana Popescu</h1>
            <WeeklyCheckInPanel
              client={{
                clientId: CLIENT_ID,
                firstName: "Ana",
                gender,
                lastName: "Popescu",
              }}
              scheduling={scheduling}
              suggestedWeekday={suggestedWeekday}
              weekly={useLoaderData<CoachClientSeriesPanel>()}
            />
          </main>
        ),
        loader: () => weekly,
        path: CLIENT_PAGE_PATH,
      },
      {
        loader: frameworkModeLoader(seriesPreviewLoader),
        path: CHECK_INS_API_PATHS.seriesPreview,
        shouldRevalidate: shouldRevalidateSeriesPreview,
      },
      {
        action: frameworkModeAction(setUpSeries),
        path: CHECK_INS_API_PATHS.series,
      },
      {
        action: frameworkModeAction(changeSeries),
        path: CHECK_INS_API_PATHS.seriesChange,
      },
      {
        action: frameworkModeAction(stopSeries),
        path: CHECK_INS_API_PATHS.seriesStop,
      },
      {
        action: frameworkModeAction(cancelCheckIn),
        path: CHECK_INS_API_PATHS.cancellation,
      },
    ],
    { initialEntries: [CLIENT_PAGE_PATH] },
  );

  const view = render(
    <MotionConfig reducedMotion="always">
      <RouterProvider router={router} />
      <Toaster />
    </MotionConfig>,
  );
  await screen.findByRole("heading", { level: 1, name: "Ana Popescu" });

  return { ...view, user };
}
