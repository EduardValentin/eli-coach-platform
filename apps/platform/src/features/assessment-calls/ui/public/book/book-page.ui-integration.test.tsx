// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { ELI_COACH_CONTACT_EMAIL } from "@eli-coach-platform/content";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
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
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";

import {
  ASSESSMENT_CALL_API_PATHS,
  BOOK_PATH,
} from "~/features/assessment-calls/contracts/paths";

import BookRoute, { shouldRevalidate } from "./book-page";
import { BOOKINGS_API_URL, SLOTS_API_URL } from "./api-client";

const TODAY = new Date("2026-03-02T06:00:00.000Z");
const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const COACH_TIME_ZONE = "Europe/Bucharest";

const FIRST_SLOT = "2026-03-02T15:00:00.000Z";
const SECOND_SLOT = "2026-03-02T16:00:00.000Z";
const NEXT_DAY_SLOT = "2026-03-03T15:00:00.000Z";
const REPLACEMENT_SLOT = "2026-03-02T17:00:00.000Z";

const OPEN_SLOTS = [FIRST_SLOT, SECOND_SLOT, NEXT_DAY_SLOT];

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

const BOOKING_ID = "2b0f2d2e-6f52-4a2e-9a19-1a1b4b1a6f11";
const TIME_LABEL = /^\d{1,2}:\d{2}\s?(AM|PM)$/i;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

afterAll(() => {
  server.close();
});

describe("booking an assessment call: choosing a time", () => {
  it("says why each closed day cannot be chosen", async () => {
    // arrange
    renderBookingPage();

    // act
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // assert
    expect(
      screen.getAllByRole("button", { name: /, No open slots$/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /, Past day$/ }).length,
    ).toBeGreaterThan(0);
  });

  it("offers the times only once a day is chosen, and names their zone", async () => {
    // arrange
    const user = renderBookingPage();
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // act
    const timesBeforeADayIsChosen = timeButtons();
    await user.click(openDayButtons()[0]);

    // assert
    expect(timesBeforeADayIsChosen).toHaveLength(0);
    await waitFor(() => {
      expect(timeButtons().length).toBeGreaterThan(0);
    });
    expect(timeButtons()[0]).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(
        (content) =>
          content.includes("All times shown in your local timezone") &&
          content.includes(BROWSER_TIME_ZONE) &&
          content.includes("GMT"),
      ),
    ).toBeInTheDocument();
  });

  it("announces the chosen day as selected", async () => {
    // arrange
    const user = renderBookingPage();
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // act
    await user.click(openDayButtons()[0]);

    // assert
    expect(openDayButtons()[0]).toHaveAccessibleName(
      /^Monday,? 2 March 2026, selected$/,
    );
  });

  it("names the zone offset of the chosen day when a clock change falls inside the open times", async () => {
    // arrange
    vi.stubEnv("TZ", "Australia/Sydney");
    vi.setSystemTime(new Date("2026-09-30T00:00:00.000Z"));
    const user = renderBookingPage({
      page: {
        botDetection: STATIC_BOT_DETECTION,
        coachTimeZone: COACH_TIME_ZONE,
        slots: ["2026-10-01T00:00:00.000Z", "2026-10-06T00:00:00.000Z"],
        status: "open",
      },
    });
    await waitFor(() => {
      expect(zoneLine()).toHaveTextContent("Australia/Sydney");
    });
    const zoneBeforeADayIsChosen = zoneLine().textContent;

    // act
    await user.click(
      screen.getByRole("button", { name: /^Tuesday,? 6 October 2026/ }),
    );

    // assert
    expect(zoneBeforeADayIsChosen).toBe(
      "All times shown in your local timezone (Australia/Sydney, GMT+10)",
    );
    expect(zoneLine()).toHaveTextContent(
      "All times shown in your local timezone (Australia/Sydney, GMT+11)",
    );
  });

  it("keeps the visitor on the times until one is chosen", async () => {
    // arrange
    const user = renderBookingPage();
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // act
    const wasInitiallyDisabled = (
      screen.getByRole("button", {
        name: "Select a date and time",
      }) as HTMLButtonElement
    ).disabled;
    await chooseFirstTime(user);

    // assert
    expect(wasInitiallyDisabled).toBe(true);
    expect(
      screen.getByRole("button", { name: "Continue to your details" }),
    ).toBeEnabled();
  });
});

describe("booking an assessment call: the details", () => {
  it("names the chosen call and keeps it while the details are rejected", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    const chosenCall = chosenCallSummary();

    // act
    await user.type(screen.getByLabelText("Full Name"), "J");
    await user.type(screen.getByLabelText("Email Address"), "not-an-address");
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    expect(
      await screen.findByText(
        "Enter your full name, between 2 and 120 characters.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toHaveAccessibleDescription(
      "Enter your full name, between 2 and 120 characters.",
    );
    expect(chosenCallSummary()).toBe(chosenCall);
  });

  it("flags an email address longer than the service accepts beside the field", async () => {
    // arrange
    let bookingRequests = 0;
    server.use(
      http.post(BOOKINGS_API_URL, () => {
        bookingRequests += 1;

        return HttpResponse.json(confirmedBooking(), { status: 201 });
      }),
    );
    const user = renderBookingPage();
    await reachDetails(user);
    await user.type(screen.getByLabelText("Full Name"), "Jane Doe");
    await user.click(screen.getByLabelText("Email Address"));
    await user.paste(`${"a".repeat(309)}@example.com`);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(bookingRequests).toBe(0);
  });

  it("sends the chosen time, the details and the visitor zone", async () => {
    // arrange
    let submitted: Record<string, FormDataEntryValue> = {};
    server.use(
      http.post(BOOKINGS_API_URL, async ({ request }) => {
        submitted = Object.fromEntries((await request.formData()).entries());

        return HttpResponse.json(confirmedBooking(), { status: 201 });
      }),
    );

    const user = renderBookingPage();
    await reachDetails(user);

    // act
    await fillDetails(user);
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    await screen.findByRole("heading", {
      level: 2,
      name: "You're booked!",
    });
    expect(submitted).toEqual({
      "cf-turnstile-response": TURNSTILE_TEST_RESPONSE_TOKEN,
      email: "jane@example.com",
      fullName: "Jane Doe",
      notes: "",
      startsAt: FIRST_SLOT,
      visitorTimeZone: BROWSER_TIME_ZONE,
    });
  });
});

describe("booking an assessment call: the outcome", () => {
  it("confirms the booked call with its time and length, and says the join link is on its way", async () => {
    // arrange
    mockBooking(confirmedBooking(), { status: 201 });
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "You're booked!",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("30 minutes")).toBeInTheDocument();
    expect(
      screen.getByText(/A confirmation with your join link is on its way to/),
    ).toHaveTextContent("jane@example.com");
    expect(
      screen.queryByRole("link", { name: /join/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to Home" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByText((content) => content.includes(BROWSER_TIME_ZONE)),
    ).toBeInTheDocument();
  });

  it("returns to refreshed times with no day chosen when the chosen one was taken", async () => {
    // arrange
    mockBooking(
      {
        error: {
          code: "slot_unavailable",
          message:
            "That time was taken while you were filling in your details. Pick another one — your details are saved.",
        },
        success: false,
      },
      { status: 409 },
    );
    server.use(
      http.get(SLOTS_API_URL, () =>
        HttpResponse.json({
          coachTimeZone: COACH_TIME_ZONE,
          slots: [SECOND_SLOT, REPLACEMENT_SLOT, NEXT_DAY_SLOT],
        }),
      ),
    );

    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);
    await user.type(
      screen.getByLabelText("Anything to share beforehand? (Optional)"),
      "Knee injury last year",
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );
    const bounceAlert = (await screen.findByRole("alert")).textContent;
    const stepAfterBounce = screen.getByRole("heading", {
      level: 2,
    });
    const focusedAfterBounce = document.activeElement;
    const timesAfterBounce = timeButtons();
    const selectedDaysAfterBounce = screen.queryAllByRole("gridcell", {
      selected: true,
    });
    await user.click(openDayButtons()[0]);
    await waitFor(() => {
      expect(offeredTimes()).toEqual(
        [SECOND_SLOT, REPLACEMENT_SLOT].map(timeLabel),
      );
    });
    const continueWasDisabled = (
      screen.getByRole("button", {
        name: "Select a date and time",
      }) as HTMLButtonElement
    ).disabled;
    await user.click(timeButton(REPLACEMENT_SLOT));
    await user.click(
      screen.getByRole("button", { name: "Continue to your details" }),
    );

    // assert
    expect(bounceAlert).toMatch(/taken while you were filling in/i);
    expect(stepAfterBounce).toHaveTextContent("Select a Date & Time");
    expect(focusedAfterBounce).toBe(stepAfterBounce);
    expect(timesAfterBounce).toHaveLength(0);
    expect(selectedDaysAfterBounce).toHaveLength(0);
    expect(continueWasDisabled).toBe(true);
    await expectEnteredDetails();
  });

  it("keeps what the visitor typed when she goes back to the times", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);
    await user.type(
      screen.getByLabelText("Anything to share beforehand? (Optional)"),
      "Knee injury last year",
    );

    // act
    await user.click(screen.getByRole("button", { name: "Back to the times" }));
    await user.click(
      await screen.findByRole("button", { name: timeLabel(SECOND_SLOT) }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to your details" }),
    );

    // assert
    await expectEnteredDetails();
  });

  it("refuses a repeat booking without revealing any call, and offers a way to reach Eli", async () => {
    // arrange
    mockBooking(
      {
        error: {
          code: "booking_refused",
          message:
            "We couldn't book this call. Email us and we'll sort it out.",
        },
        success: false,
      },
      { status: 409 },
    );
    const user = renderBookingPage();
    await reachDetails(user);
    const chosenCall = chosenCallSummary();
    await fillDetails(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't book this call/i);
    expect(alert).not.toHaveTextContent(/\d{1,2}:\d{2}/);
    expect(alert).not.toHaveTextContent(/March|2026/);
    expect(
      within(alert).getByRole("link", { name: ELI_COACH_CONTACT_EMAIL }),
    ).toHaveAttribute("href", `mailto:${ELI_COACH_CONTACT_EMAIL}`);
    expect(within(alert).getAllByRole("link")).toHaveLength(1);
    expect(
      screen.queryByRole("link", { name: /join/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Almost there" }),
    ).toBeInTheDocument();
    expect(chosenCallSummary()).toBe(chosenCall);
  });

  it("offers a way to reach Eli when the server fails, and lets her retry", async () => {
    // arrange
    mockBooking(
      {
        error: {
          code: "server_error",
          message: "Something went wrong on our end. Please try again.",
        },
        success: false,
      },
      { status: 500 },
    );
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/went wrong on our end/i);
    expect(
      screen.getByRole("link", { name: ELI_COACH_CONTACT_EMAIL }),
    ).toHaveAttribute("href", `mailto:${ELI_COACH_CONTACT_EMAIL}`);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Schedule Assessment" }),
      ).toBeEnabled();
    });
    expect(screen.getByLabelText("Email Address")).toHaveValue(
      "jane@example.com",
    );
  });

  it("lets the visitor try again when bot verification is refused", async () => {
    // arrange
    let attempts = 0;
    server.use(
      http.post(BOOKINGS_API_URL, () => {
        attempts += 1;

        if (attempts === 1) {
          return HttpResponse.json(
            {
              error: {
                code: "bot_verification_failed",
                message: "We could not confirm this request. Please try again.",
              },
              success: false,
            },
            { status: 400 },
          );
        }

        return HttpResponse.json(confirmedBooking(), { status: 201 });
      }),
    );

    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );
    const alert = await screen.findByRole("alert");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Schedule Assessment" }),
      ).toBeEnabled();
    });
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    expect(alert).toHaveTextContent(/could not confirm this request/i);
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "You're booked!",
      }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});

describe("booking an assessment call: moving between steps", () => {
  it("moves focus to the details heading when the visitor continues", async () => {
    // arrange
    const user = renderBookingPage();
    await chooseFirstTime(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Continue to your details" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", { level: 2, name: "Almost there" }),
    ).toHaveFocus();
  });

  it("moves focus to the times heading when the visitor goes back", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);

    // act
    await user.click(screen.getByRole("button", { name: "Back to the times" }));

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Select a Date & Time",
      }),
    ).toHaveFocus();
  });

  it("reopens the calendar on the month of a next-month day chosen from the overflow row", async () => {
    // arrange
    vi.stubEnv("TZ", COACH_TIME_ZONE);
    const user = renderBookingPage({
      page: {
        botDetection: STATIC_BOT_DETECTION,
        coachTimeZone: COACH_TIME_ZONE,
        slots: [FIRST_SLOT, "2026-04-01T12:00:00.000Z"],
        status: "open",
      },
    });
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });
    await user.click(
      screen.getByRole("button", { name: /^Wednesday,? 1 April 2026$/ }),
    );
    await waitFor(() => {
      expect(timeButtons().length).toBeGreaterThan(0);
    });
    await user.click(timeButtons()[0]);
    await user.click(
      screen.getByRole("button", { name: "Continue to your details" }),
    );
    await screen.findByRole("heading", { level: 2, name: "Almost there" });

    // act
    await user.click(screen.getByRole("button", { name: "Back to the times" }));

    // assert
    expect(
      await screen.findByRole("grid", { name: "Available days, April 2026" }),
    ).toBeInTheDocument();
    const selectedDay = screen.getByRole("gridcell", { selected: true });
    expect(selectedDay).toHaveAttribute("data-day", "2026-04-01");
    expect(selectedDay).not.toHaveAttribute("data-outside");
    expect(within(selectedDay).getByRole("button")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("announces a booked call by moving focus to its heading", async () => {
    // arrange
    mockBooking(confirmedBooking(), { status: 201 });
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(
      screen.getByRole("button", { name: "Schedule Assessment" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "You're booked!",
      }),
    ).toHaveFocus();
  });

  it("leaves focus where it was when the page first opens", async () => {
    // arrange
    renderBookingPage();

    // act
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Select a Date & Time" }),
    ).not.toHaveFocus();
  });
});

describe("booking an assessment call: unreadable open slots", () => {
  it("explains the times are unreadable and offers to load them again", async () => {
    // arrange
    server.use(
      http.get(SLOTS_API_URL, () =>
        HttpResponse.json({
          coachTimeZone: COACH_TIME_ZONE,
          slots: OPEN_SLOTS,
        }),
      ),
    );

    const user = renderBookingPage({
      page: { botDetection: STATIC_BOT_DETECTION, status: "unavailable" },
    });

    // assert
    expect(
      await screen.findByText("We couldn't load the open times just now."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(
      screen.queryByText("We couldn't load the open times just now."),
    ).not.toBeInTheDocument();
  });
});

describe("booking page revalidation", () => {
  it("keeps the open times while a booking is submitted", () => {
    // arrange
    const submission = { defaultShouldRevalidate: true, formMethod: "POST" };

    // act
    const revalidates = shouldRevalidate(
      submission as Parameters<typeof shouldRevalidate>[0],
    );

    // assert
    expect(revalidates).toBe(false);
  });
});

type BookingPageValue = {
  botDetection: BotDetectionConfig;
  coachTimeZone?: string;
  slots?: readonly string[];
  status: "open" | "unavailable";
};

function renderBookingPage(options?: { page?: BookingPageValue }): UserEvent {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const page = options?.page ?? {
    botDetection: STATIC_BOT_DETECTION,
    coachTimeZone: COACH_TIME_ZONE,
    slots: OPEN_SLOTS,
    status: "open",
  };
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <main aria-label="Public site content">
            <BookRoute />
          </main>
        ),
        loader: () => page,
        path: BOOK_PATH,
        shouldRevalidate,
      },
      {
        loader: () => fetch(SLOTS_API_URL),
        path: ASSESSMENT_CALL_API_PATHS.slots,
      },
      {
        action: async ({ request }: { request: Request }) => fetch(request),
        path: ASSESSMENT_CALL_API_PATHS.bookings,
      },
    ],
    { initialEntries: [BOOK_PATH] },
  );

  render(<RouterProvider router={router} />);

  return user;
}

function openDayButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      "td[data-day] button:not([disabled])",
    ),
  );
}

function zoneLine(): HTMLElement {
  return screen.getByText(/^All times shown in your local timezone /);
}

function timeButtons(): HTMLElement[] {
  return screen.queryAllByRole("button", { name: TIME_LABEL });
}

function offeredTimes(): string[] {
  return timeButtons().map((time) => time.textContent ?? "");
}

function timeLabel(slot: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: BROWSER_TIME_ZONE,
  }).format(new Date(slot));
}

function timeButton(slot: string): HTMLElement {
  return screen.getByRole("button", { name: timeLabel(slot) });
}

function chosenCallSummary(): string | null {
  const aboutTheCall = screen.getByRole("complementary", {
    name: "About the call",
  });

  return (
    within(aboutTheCall).getByText(/\d{4}$/).parentElement?.textContent ?? null
  );
}

async function expectEnteredDetails() {
  expect(await screen.findByLabelText("Full Name")).toHaveValue("Jane Doe");
  expect(screen.getByLabelText("Email Address")).toHaveValue(
    "jane@example.com",
  );
  expect(
    screen.getByLabelText("Anything to share beforehand? (Optional)"),
  ).toHaveValue("Knee injury last year");
}

async function chooseFirstTime(user: UserEvent) {
  await waitFor(() => {
    expect(openDayButtons().length).toBeGreaterThan(0);
  });
  await user.click(openDayButtons()[0]);
  await waitFor(() => {
    expect(timeButtons().length).toBeGreaterThan(0);
  });
  await user.click(timeButtons()[0]);
}

async function reachDetails(user: UserEvent) {
  await chooseFirstTime(user);
  await user.click(
    screen.getByRole("button", { name: "Continue to your details" }),
  );
  await screen.findByRole("heading", { level: 2, name: "Almost there" });
}

async function fillDetails(user: UserEvent) {
  await user.type(screen.getByLabelText("Full Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email Address"), "jane@example.com");
  await waitFor(() => {
    expect(screen.getByTestId("bot-detection-widget")).toBeInTheDocument();
  });
}

function confirmedBooking() {
  return {
    booking: {
      durationMinutes: 30,
      id: BOOKING_ID,
      joinPath: `${BOOK_PATH}/${BOOKING_ID}/join`,
      startsAt: FIRST_SLOT,
      visitorTimeZone: BROWSER_TIME_ZONE,
    },
    success: true,
  };
}

function mockBooking(
  response: Parameters<typeof HttpResponse.json>[0],
  init: ResponseInit,
) {
  server.use(
    http.post(BOOKINGS_API_URL, () => HttpResponse.json(response, init)),
  );
}
