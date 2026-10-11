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

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { clientAction as scheduleCheckIn } from "~/features/check-ins/api/coach/schedule";
import {
  clientLoader as openTimesLoader,
  shouldRevalidate as shouldRevalidateOpenTimes,
} from "~/features/check-ins/api/shared/open-times";
import type { CheckInScheduling } from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/server/test-support/framework-mode-action";

import { ScheduleCheckInAction } from "./schedule-check-in-action";

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";
const CLIENT_PAGE_PATH = "/coach/clients/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const SCHEDULED_ID = "6a7b8c9d-0e1f-4a2b-8c3d-5e6f7a8b9c0d";

const THURSDAY_AFTERNOON = "2026-10-15T14:00:00.000Z";
const THURSDAY_EVENING = "2026-10-15T15:00:00.000Z";
const FRIDAY_AFTERNOON = "2026-10-16T14:00:00.000Z";
const OPEN_TIMES = [THURSDAY_AFTERNOON, THURSDAY_EVENING, FRIDAY_AFTERNOON];

const TITLE = "Schedule a check-in with Ana";
const NOTE_LABEL = "Add a note for Ana (optional)";
const AWAITING_REASON =
  "She can answer a check-in once she has sent her onboarding.";

const OPEN_TIMES_URL = `*${CHECK_INS_API_PATHS.openTimes}`;
const SCHEDULE_URL = `*${CHECK_INS_API_PATHS.schedule}`;

type ActionRendering = {
  gender?: VisitorGender;
  scheduling: CheckInScheduling;
};

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

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

describe("the coach's Schedule check-in action", () => {
  it("is offered for a client who can answer", async () => {
    // arrange, act
    await renderAction({ scheduling: "allowed" });

    // assert
    const button = scheduleButton();
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAccessibleDescription();
  });

  it("is left out once her coaching has ended", async () => {
    // arrange, act
    await renderAction({ scheduling: "ended" });

    // assert
    expect(
      screen.queryByRole("button", { name: "Schedule check-in" }),
    ).not.toBeInTheDocument();
  });

  it("is held back before she sends her onboarding without a line explaining it", async () => {
    // arrange, act
    await renderAction({ scheduling: "awaiting_onboarding" });

    // assert
    const button = scheduleButton();
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(AWAITING_REASON)).not.toBeInTheDocument();
  });

  it("explains why it is held back when the coach hovers it", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.hover(scheduleButton());

    // assert
    expect(await screen.findByText(AWAITING_REASON)).toBeVisible();
    expect(scheduleButton()).toHaveAccessibleDescription(AWAITING_REASON);
  });

  it("explains why it is held back when the coach tabs to it", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.tab();

    // assert
    expect(scheduleButton()).toHaveFocus();
    expect(scheduleButton()).toHaveAccessibleDescription(AWAITING_REASON);
  });

  it("explains why it is held back when the coach taps it, without opening the dialog", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.pointer({ keys: "[TouchA]", target: scheduleButton() });

    // assert
    expect(await screen.findByText(AWAITING_REASON)).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Schedule a check-in with Ana" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("does not open the dialog on %s while held back", async (_key, keys) => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });
    await user.tab();

    // act
    await user.keyboard(keys);

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Schedule a check-in with Ana" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["male", "He can answer a check-in once he has sent his onboarding."],
    [
      "prefer_not_to_say",
      "They can answer a check-in once they have sent their onboarding.",
    ],
  ] as const)(
    "words the reason for a client who is %s",
    async (gender, reason) => {
      // arrange
      const user = await renderAction({
        gender,
        scheduling: "awaiting_onboarding",
      });

      // act
      await user.hover(scheduleButton());

      // assert
      expect(await screen.findByText(reason)).toBeVisible();
    },
  );

  it("passes the axe checks with the reason open", async () => {
    // arrange
    const user = await renderAction({ scheduling: "awaiting_onboarding" });

    // act
    await user.hover(scheduleButton());
    await screen.findByText(AWAITING_REASON);

    // assert
    expect((await axe(document.body)).violations).toEqual([]);
  });
});

describe("the coach scheduling a check-in", () => {
  it("opens on its title naming the client, offers only open times step by step and sends her note with the chosen time", async () => {
    // arrange
    const schedules = answerSchedules(() =>
      HttpResponse.json(
        { status: "scheduled", checkInId: SCHEDULED_ID },
        { status: 201 },
      ),
    );
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });

    // act
    await user.click(scheduleButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });
    const title = within(dialog).getByRole("heading", {
      level: 3,
      name: TITLE,
    });
    const focusOnOpen = document.activeElement;
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });
    const stepBeforeDay = stepButton(dialog).textContent;
    await user.click(
      within(dialog).getByRole("button", {
        name: /Thursday,? 15 October 2026/,
      }),
    );
    const afterDay = stepButton(dialog).textContent;
    await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));
    const afterTime = stepButton(dialog).textContent;
    await user.click(within(dialog).getByRole("textbox", { name: NOTE_LABEL }));
    await user.paste("Let's look at your first two weeks");
    await user.click(stepButton(dialog));

    // assert
    expect(focusOnOpen).toBe(title);
    expect(dialog).toHaveTextContent(
      "Pick a date and time. Ana will approve or decline it.",
    );
    expect(stepBeforeDay).toBe("Select a date");
    expect(afterDay).toBe("Select a time");
    expect(afterTime).toBe("Schedule 6:00 PM");
    expect(
      await screen.findByText("Check-in scheduled for Thu, Oct 15"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(scheduleButton()).toHaveFocus();
    expect(schedules).toEqual([
      {
        clientId: CLIENT_ID,
        note: "Let's look at your first two weeks",
        startsAt: THURSDAY_EVENING,
      },
    ]);
  });

  it("shows the scheduling under way and holds the step until the server answers", async () => {
    // arrange
    let release: () => void = () => {};
    server.use(
      http.post(SCHEDULE_URL, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { status: "scheduled", checkInId: SCHEDULED_ID },
          { status: 201 },
        );
      }),
    );
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);

    // act
    await user.click(stepButton(dialog));
    const busy = await within(dialog).findByRole("button", {
      name: "Scheduling…",
    });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(
      await screen.findByText("Check-in scheduled for Thu, Oct 15"),
    ).toBeInTheDocument();
  });

  it("tells her a time was taken, refreshes the times and keeps her note", async () => {
    // arrange
    answerSchedules(() =>
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
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: NOTE_LABEL }),
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
    expect(stepButton(dialog)).toHaveTextContent("Select a time");
    expect(
      within(dialog).getByRole("textbox", { name: NOTE_LABEL }),
    ).toHaveValue("Form check");
    expect(reads).toBe(2);
  });

  it("lets her schedule another time once the one she picked was taken", async () => {
    // arrange
    let attempts = 0;
    const schedules = answerSchedules(() => {
      attempts += 1;
      return attempts === 1
        ? HttpResponse.json({ error: "time_taken" }, { status: 409 })
        : HttpResponse.json(
            { status: "scheduled", checkInId: SCHEDULED_ID },
            { status: 201 },
          );
    });
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);
    await user.click(stepButton(dialog));
    await within(dialog).findByRole("alert");

    // act
    await user.click(
      await within(dialog).findByRole("button", { name: "5:00 PM" }),
    );
    await user.click(stepButton(dialog));

    // assert
    expect(
      await screen.findByText("Check-in scheduled for Thu, Oct 15"),
    ).toBeInTheDocument();
    expect(schedules).toEqual([
      expect.objectContaining({ startsAt: THURSDAY_EVENING }),
      expect.objectContaining({ startsAt: THURSDAY_AFTERNOON }),
    ]);
  });

  it("says the client cannot answer a check-in right now", async () => {
    // arrange
    answerSchedules(() =>
      HttpResponse.json({ error: "client_cannot_answer" }, { status: 409 }),
    );
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Ana can't answer a check-in right now.",
    );
  });

  it("asks her to try again when scheduling fails, keeping the picked time", async () => {
    // arrange
    answerSchedules(
      () => new HttpResponse("Internal Server Error", { status: 500 }),
    );
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The check-in wasn't scheduled. Try again.",
    );
    expect(stepButton(dialog)).toHaveTextContent("Schedule 6:00 PM");
  });

  it("can be reached and dismissed by keyboard, handing focus back to Schedule check-in", async () => {
    // arrange
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    scheduleButton().focus();

    // act
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: TITLE });
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(scheduleButton()).toHaveFocus();
  });

  it("starts afresh each time it opens", async () => {
    // arrange
    answerOpenTimes();
    const user = await renderAction({ scheduling: "allowed" });
    const dialog = await openDialogOnThursdayEvening(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: NOTE_LABEL }),
      "Draft",
    );
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // act
    await user.click(scheduleButton());

    // assert
    const reopened = await screen.findByRole("dialog", { name: TITLE });
    expect(
      within(reopened).getByRole("textbox", { name: NOTE_LABEL }),
    ).toHaveValue("");
    expect(stepButton(reopened)).toHaveTextContent("Select a date");
  });

  it("passes the axe checks with the dialog open", async () => {
    // arrange
    answerOpenTimes();
    const { baseElement, user } = await renderActionWithView({
      scheduling: "allowed",
    });
    await user.click(scheduleButton());
    const dialog = await screen.findByRole("dialog", { name: TITLE });
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    });

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});

function answerOpenTimes(times: readonly string[] = OPEN_TIMES) {
  server.use(http.get(OPEN_TIMES_URL, () => HttpResponse.json({ times })));
}

function answerSchedules(answer: () => Response): unknown[] {
  const received: unknown[] = [];
  server.use(
    http.post(SCHEDULE_URL, async ({ request }) => {
      received.push(await request.json());
      return answer();
    }),
  );

  return received;
}

async function openDialogOnThursdayEvening(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(scheduleButton());
  const dialog = await screen.findByRole("dialog", { name: TITLE });
  await user.click(
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    }),
  );
  await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));

  return dialog;
}

function scheduleButton(): HTMLElement {
  return screen.getByRole("button", { name: "Schedule check-in" });
}

function stepButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("button", {
    name: /^(Select a date|Select a time|Schedule .+|Scheduling…)$/,
  });
}

async function renderAction(options: ActionRendering) {
  const { user } = await renderActionWithView(options);

  return user;
}

async function renderActionWithView({
  gender = "female",
  scheduling,
}: ActionRendering) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Coach portal content">
            <h1>Ana Popescu</h1>
            <ScheduleCheckInAction
              client={{ clientId: CLIENT_ID, firstName: "Ana", gender }}
              scheduling={scheduling}
            />
          </main>
        ),
        loader: () => null,
        path: CLIENT_PAGE_PATH,
      },
      {
        loader: frameworkModeLoader(openTimesLoader),
        path: CHECK_INS_API_PATHS.openTimes,
        shouldRevalidate: shouldRevalidateOpenTimes,
      },
      {
        action: frameworkModeAction(scheduleCheckIn),
        path: CHECK_INS_API_PATHS.schedule,
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
