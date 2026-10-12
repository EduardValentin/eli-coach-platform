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
import { useState } from "react";
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

import { clientAction as proposeNewTime } from "~/features/check-ins/api/shared/new-time";
import {
  clientLoader as openTimesLoader,
  shouldRevalidate as shouldRevalidateOpenTimes,
} from "~/features/check-ins/api/shared/open-times";
import type { ClientCheckIns } from "~/features/check-ins/public/check-ins";
import { CHECK_INS_API_PATHS } from "~/features/check-ins/public/paths";
import {
  frameworkModeAction,
  frameworkModeLoader,
} from "~/server/test-support/framework-mode-action";

import {
  ProposeCheckInTimeDialog,
  type CheckInProposer,
} from "./propose-check-in-time-dialog";

type ListedCheckIn = ClientCheckIns["checkIns"][number];

const NOW = new Date("2026-10-12T08:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";
const PAGE_PATH = "/client/checkins";
const CLIENT_ID = "6a7b8c9d-0e1f-4a2b-8c3d-5e6f7a8b9c0d";

const APPROVED: ListedCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "ad_hoc",
  status: "approved",
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

const THURSDAY_AFTERNOON = "2026-10-15T14:00:00.000Z";
const THURSDAY_EVENING = "2026-10-15T15:00:00.000Z";
const FRIDAY_AFTERNOON = "2026-10-16T14:00:00.000Z";
const OPEN_TIMES = [THURSDAY_AFTERNOON, THURSDAY_EVENING, FRIDAY_AFTERNOON];

const CLIENT_PROPOSER: CheckInProposer = {
  clientTimeZone: TIME_ZONE,
  noteLabel: "Add a note for your coach (optional)",
};

const COACH_PROPOSER: CheckInProposer = {
  noteLabel: "Add a note for Andreea (optional)",
  openTimesQuery: { clientId: CLIENT_ID },
};

const TITLE = "Propose a new time";

const OPEN_TIMES_URL = `*${CHECK_INS_API_PATHS.openTimes}`;
const NEW_TIME_URL = `*${CHECK_INS_API_PATHS.newTime}`;

const server = setupServer();
const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

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

describe("proposing a new time for a check-in", () => {
  it("opens on its title with the current time, offers open times step by step and proposes the chosen time with her note", async () => {
    // arrange
    const proposals = answerNewTimes(() =>
      HttpResponse.json({ status: "proposed", checkInId: APPROVED.id }),
    );
    answerOpenTimes();
    const user = await renderDialogHost(CLIENT_PROPOSER);

    // act
    await user.click(openerButton());
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
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach (optional)",
      }),
      "Thursday evening suits me better",
    );
    await user.click(stepButton(dialog));

    // assert
    expect(focusOnOpen).toBe(title);
    expect(dialog).toHaveTextContent(
      "Currently set for Wed, Oct 14 · 10:00 AM",
    );
    expect(stepBeforeDay).toBe("Select a date");
    expect(afterDay).toBe("Select a time");
    expect(afterTime).toBe("Propose 6:00 PM");
    expect(await screen.findByText("New time proposed")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(openerButton()).toHaveFocus();
    expect(proposals).toEqual([
      {
        checkInId: APPROVED.id,
        body: {
          note: "Thursday evening suits me better",
          startsAt: THURSDAY_EVENING,
          timeZone: TIME_ZONE,
        },
      },
    ]);
  });

  it("asks for the open times of the coach's client and leaves the client's time zone out of the coach's proposal", async () => {
    // arrange
    const asked: (string | null)[] = [];
    server.use(
      http.get(OPEN_TIMES_URL, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get("clientId"));
        return HttpResponse.json({ times: OPEN_TIMES });
      }),
    );
    const proposals = answerNewTimes(() =>
      HttpResponse.json({ status: "proposed", checkInId: APPROVED.id }),
    );
    const user = await renderDialogHost(COACH_PROPOSER);

    // act
    const dialog = await openOnThursdayEvening(user);
    const noteField = within(dialog).queryByRole("textbox", {
      name: "Add a note for Andreea (optional)",
    });
    await user.click(stepButton(dialog));

    // assert
    expect(await screen.findByText("New time proposed")).toBeInTheDocument();
    expect(asked).toEqual([CLIENT_ID]);
    expect(noteField).not.toBeNull();
    expect(proposals).toEqual([
      {
        checkInId: APPROVED.id,
        body: { note: "", startsAt: THURSDAY_EVENING },
      },
    ]);
  });

  it("shows the proposal under way and holds the step until the server answers", async () => {
    // arrange
    let release: () => void = () => {};
    answerOpenTimes();
    server.use(
      http.post(NEW_TIME_URL, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({
          status: "proposed",
          checkInId: APPROVED.id,
        });
      }),
    );
    const user = await renderDialogHost(CLIENT_PROPOSER);
    const dialog = await openOnThursdayEvening(user);

    // act
    await user.click(stepButton(dialog));
    const busy = await within(dialog).findByRole("button", {
      name: "Proposing…",
    });
    const busyWhileWaiting = busy.hasAttribute("disabled");
    release();

    // assert
    expect(busyWhileWaiting).toBe(true);
    expect(await screen.findByText("New time proposed")).toBeInTheDocument();
  });

  it("tells her a time was taken, refreshes the times, keeps her note and reads the check-ins again", async () => {
    // arrange
    answerNewTimes(() =>
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
    const user = await renderDialogHost(CLIENT_PROPOSER);
    const dialog = await openOnThursdayEvening(user);
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach (optional)",
      }),
      "Form check",
    );
    const readsBefore = listingReads;

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
      within(dialog).getByRole("textbox", {
        name: "Add a note for your coach (optional)",
      }),
    ).toHaveValue("Form check");
    await waitFor(() => {
      expect(listingReads).toBeGreaterThan(readsBefore);
    });
  });

  it.each([
    ["moves_exhausted", "This check-in can't be moved any more."],
    ["not_pending", "This request is no longer waiting for an answer."],
  ])(
    "says why the new time was refused on %s and reads the check-ins again",
    async (refusal, message) => {
      // arrange
      answerOpenTimes();
      answerNewTimes(() =>
        HttpResponse.json({ error: refusal }, { status: 409 }),
      );
      const user = await renderDialogHost(CLIENT_PROPOSER);
      const dialog = await openOnThursdayEvening(user);
      const readsBefore = listingReads;

      // act
      await user.click(stepButton(dialog));

      // assert
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        message,
      );
      await waitFor(() => {
        expect(listingReads).toBeGreaterThan(readsBefore);
      });
      expect(screen.queryByText("New time proposed")).not.toBeInTheDocument();
    },
  );

  it("asks her to try again when the server could not answer, keeping the picked time", async () => {
    // arrange
    answerOpenTimes();
    server.use(http.post(NEW_TIME_URL, () => HttpResponse.error()));
    const user = await renderDialogHost(CLIENT_PROPOSER);
    const dialog = await openOnThursdayEvening(user);

    // act
    await user.click(stepButton(dialog));

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The new time wasn't proposed. Try again.",
    );
    expect(stepButton(dialog)).toHaveTextContent("Propose 6:00 PM");
  });

  it("can be dismissed by keyboard, handing focus back to the action that opened it", async () => {
    // arrange
    answerOpenTimes();
    const user = await renderDialogHost(CLIENT_PROPOSER);
    openerButton().focus();

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
    expect(openerButton()).toHaveFocus();
  });

  it("passes the axe checks while open", async () => {
    // arrange
    answerOpenTimes();
    const { baseElement, user } =
      await renderDialogHostWithView(CLIENT_PROPOSER);
    await user.click(openerButton());
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

function answerNewTimes(
  answer: () => Response,
): { checkInId: string; body: unknown }[] {
  const received: { checkInId: string; body: unknown }[] = [];
  server.use(
    http.post(NEW_TIME_URL, async ({ params, request }) => {
      received.push({
        checkInId: String(params.checkInId),
        body: await request.json(),
      });
      return answer();
    }),
  );

  return received;
}

async function openOnThursdayEvening(user: UserEvent): Promise<HTMLElement> {
  await user.click(openerButton());
  const dialog = await screen.findByRole("dialog", { name: TITLE });
  await user.click(
    await within(dialog).findByRole("button", {
      name: /Thursday,? 15 October 2026/,
    }),
  );
  await user.click(within(dialog).getByRole("button", { name: "6:00 PM" }));

  return dialog;
}

function openerButton(): HTMLElement {
  return screen.getByRole("button", { name: "Reschedule" });
}

function stepButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("button", {
    name: /^(Select a date|Select a time|Propose .+|Proposing…)$/,
  });
}

function DialogHost({ proposer }: { proposer: CheckInProposer }) {
  const [openings, setOpenings] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <main aria-label="Portal content">
      <h1>Check-ins</h1>
      <button
        onClick={() => {
          setOpenings((count) => count + 1);
          setOpen(true);
        }}
        type="button"
      >
        Reschedule
      </button>
      {openings > 0 && (
        <ProposeCheckInTimeDialog
          checkIn={APPROVED}
          key={openings}
          onOpenChange={setOpen}
          open={open}
          proposer={proposer}
          timeZone={TIME_ZONE}
        />
      )}
    </main>
  );
}

async function renderDialogHost(proposer: CheckInProposer) {
  const { user } = await renderDialogHostWithView(proposer);

  return user;
}

async function renderDialogHostWithView(proposer: CheckInProposer) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const router = createMemoryRouter(
    [
      {
        Component: () => <DialogHost proposer={proposer} />,
        loader: () => {
          listingReads += 1;
          return null;
        },
        path: PAGE_PATH,
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
    ],
    { initialEntries: [PAGE_PATH] },
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
