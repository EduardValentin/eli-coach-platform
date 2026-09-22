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
const COACH_TIME_ZONE = "Europe/Bucharest";
const BROWSER_TIME_ZONE = COACH_TIME_ZONE;

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
// Nine fields, four Radix selects and a calendar per flow: a loaded runner
// needs more than vitest's 5s default for the booking flows.
const BOOKING_FLOW = { timeout: 15000 };

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
  vi.stubEnv("TZ", BROWSER_TIME_ZONE);
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

  it("names today's date as today", async () => {
    // arrange
    vi.stubEnv("TZ", COACH_TIME_ZONE);
    renderBookingPage();

    // act
    await waitFor(() => {
      expect(openDayButtons().length).toBeGreaterThan(0);
    });

    // assert
    expect(
      screen.getByRole("button", { name: /^Today, Monday,? 2 March 2026/ }),
    ).toBeInTheDocument();
  });

  it("offers the times only once a day is chosen, naming no zone", async () => {
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
      screen.queryByText(/timezone|time zone|GMT/i),
    ).not.toBeInTheDocument();
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
      /^Today, Monday,? 2 March 2026, selected$/,
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

describe("booking an assessment call: the details", BOOKING_FLOW, () => {
  it("explains every rejected detail under its field and keeps the chosen call", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    const chosenCall = chosenCallSummary();

    // act
    await user.type(screen.getByLabelText("Email Address"), "not-an-address");
    await user.type(screen.getByLabelText("Phone number"), "12ab");
    await user.click(
      screen.getByLabelText("Anything to share beforehand? (Optional)"),
    );
    await user.paste("x".repeat(1001));
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

    // assert
    expect(
      await screen.findByText("Enter your first name, up to 60 characters."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveAccessibleDescription(
      "Enter your first name, up to 60 characters.",
    );
    expect(screen.getByLabelText("Last name")).toHaveAccessibleDescription(
      "Enter your last name, up to 60 characters.",
    );
    expect(screen.getByLabelText("Email Address")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.getByLabelText("Date of birth")).toHaveAccessibleDescription(
      "Choose your date of birth.",
    );
    expect(
      screen.getByRole("combobox", { name: "Gender" }),
    ).toHaveAccessibleDescription("Choose an option.");
    expect(
      screen.getByRole("combobox", { name: "Primary goal" }),
    ).toHaveAccessibleDescription("Choose your primary goal.");
    expect(
      screen.getByRole("combobox", { name: "Country" }),
    ).toHaveAccessibleDescription("Choose your country.");
    expect(screen.getByLabelText("Phone number")).toHaveAccessibleDescription(
      "Enter a phone number with digits only, 4 to 14 digits after the country code.",
    );
    expect(
      screen.getByLabelText("Anything to share beforehand? (Optional)"),
    ).toHaveAccessibleDescription("Keep your note under 1000 characters.");
    expect(screen.getByLabelText("First name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(chosenCallSummary()).toBe(chosenCall);
  });

  it("offers no birth date that would make the visitor under 18 on the booking day", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    await user.click(screen.getByLabelText("Date of birth"));

    // act
    await chooseOption(user, "Year", "2008");
    await chooseOption(user, "Month", "March");

    // assert
    expect(calendarDayButton("2008-03-03")).toBeDisabled();
    expect(calendarDayButton("2008-03-02")).toBeEnabled();
    expect(screen.queryByRole("option", { name: "2009" })).toBeNull();
  });

  it("shows the chosen birth date on the field and closes the calendar", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    await user.click(screen.getByLabelText("Date of birth"));
    await chooseOption(user, "Year", "2008");
    await chooseOption(user, "Month", "March");

    // act
    await user.click(calendarDayButton("2008-03-02"));

    // assert
    expect(screen.getByLabelText("Date of birth")).toHaveTextContent(
      "2 March 2008",
    );
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("preselects the calling code from the country until the visitor changes it herself", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);

    // act
    await chooseOption(user, "Country", "Romania");
    const afterCountry = screen.getByRole("combobox", {
      name: "Country calling code",
    }).textContent;
    await chooseOption(user, "Country calling code", "+44 GB");
    await chooseOption(user, "Country", "France");

    // assert
    expect(afterCountry).toBe("+40 RO");
    expect(
      screen.getByRole("combobox", { name: "Country calling code" }),
    ).toHaveTextContent("+44 GB");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent(
      "France",
    );
  });

  it("moves focus to the first rejected detail", async () => {
    // arrange
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);
    await user.clear(screen.getByLabelText("Email Address"));
    await user.type(screen.getByLabelText("Email Address"), "not-an-address");

    // act
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

    // assert
    await waitFor(() => {
      expect(screen.getByLabelText("Email Address")).toHaveFocus();
    });
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
    await fillDetails(user);
    await user.clear(screen.getByLabelText("Email Address"));
    await user.click(screen.getByLabelText("Email Address"));
    await user.paste(`${"a".repeat(309)}@example.com`);

    // act
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

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

  it("sends the chosen time, every detail and the visitor zone", async () => {
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
    await user.type(screen.getByLabelText("Phone number"), "0712 345 678");
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

    // assert
    await screen.findByRole("heading", {
      level: 2,
      name: "You're booked!",
    });
    expect(submitted).toEqual({
      "cf-turnstile-response": TURNSTILE_TEST_RESPONSE_TOKEN,
      country: "RO",
      dateOfBirth: "1994-03-14",
      email: "jane@example.com",
      firstName: "Jane",
      gender: "female",
      lastName: "Doe",
      notes: "",
      phoneCountry: "RO",
      phoneNumber: "0712 345 678",
      primaryGoal: "build_strength",
      startsAt: FIRST_SLOT,
      visitorTimeZone: BROWSER_TIME_ZONE,
    });
  });

  it("books without a phone when the number is left empty", async () => {
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
    await fillDetails(user);

    // act
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

    // assert
    await screen.findByRole("heading", { level: 2, name: "You're booked!" });
    expect(submitted.phoneNumber).toBe("");
    expect(submitted.phoneCountry).toBe("RO");
  });
});

describe("booking an assessment call: the outcome", BOOKING_FLOW, () => {
  it("confirms the booked call with its time and length, and says the join link is on its way", async () => {
    // arrange
    vi.stubEnv("TZ", COACH_TIME_ZONE);
    mockBooking(confirmedBooking(), { status: 201 });
    const user = renderBookingPage();
    await reachDetails(user);
    await fillDetails(user);

    // act
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

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
      screen.getByText(/^Monday, March 2, 2026\s+5:00\sPM$/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Europe\/Bucharest|GMT/)).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));
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
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

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
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

    // assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/went wrong on our end/i);
    expect(
      screen.getByRole("link", { name: ELI_COACH_CONTACT_EMAIL }),
    ).toHaveAttribute("href", `mailto:${ELI_COACH_CONTACT_EMAIL}`);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Schedule Call" }),
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
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Schedule Call" }),
      ).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Schedule Call" }));

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

describe(
  "booking an assessment call: moving between steps",
  BOOKING_FLOW,
  () => {
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
      await user.click(
        screen.getByRole("button", { name: "Back to the times" }),
      );

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
      await user.click(
        screen.getByRole("button", { name: "Back to the times" }),
      );

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
      await user.click(screen.getByRole("button", { name: "Schedule Call" }));

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
  },
);

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
  expect(await screen.findByLabelText("First name")).toHaveValue("Jane");
  expect(screen.getByLabelText("Last name")).toHaveValue("Doe");
  expect(screen.getByLabelText("Email Address")).toHaveValue(
    "jane@example.com",
  );
  expect(screen.getByLabelText("Date of birth")).toHaveTextContent(
    "14 March 1994",
  );
  expect(screen.getByRole("combobox", { name: "Gender" })).toHaveTextContent(
    "Female",
  );
  expect(
    screen.getByRole("combobox", { name: "Primary goal" }),
  ).toHaveTextContent("Build strength");
  expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent(
    "Romania",
  );
  expect(
    screen.getByRole("combobox", { name: "Country calling code" }),
  ).toHaveTextContent("+40 RO");
  expect(
    screen.getByLabelText("Anything to share beforehand? (Optional)"),
  ).toHaveValue("Knee injury last year");
}

async function chooseOption(user: UserEvent, field: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

function calendarDayButton(dayKey: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    `td[data-day="${dayKey}"] button`,
  );

  if (!button) {
    throw new Error(`No calendar day ${dayKey}`);
  }

  return button;
}

async function chooseBirthDate(user: UserEvent, dayKey = "1994-03-14") {
  const [year, month] = dayKey.split("-");
  await user.click(screen.getByLabelText("Date of birth"));
  await chooseOption(user, "Year", year);
  await chooseOption(user, "Month", MONTH_NAMES[Number(month) - 1]);
  await user.click(calendarDayButton(dayKey));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  await user.type(screen.getByLabelText("First name"), "Jane");
  await user.type(screen.getByLabelText("Last name"), "Doe");
  await user.type(screen.getByLabelText("Email Address"), "jane@example.com");
  await chooseBirthDate(user);
  await chooseOption(user, "Gender", "Female");
  await chooseOption(user, "Primary goal", "Build strength");
  await chooseOption(user, "Country", "Romania");
  await waitFor(() => {
    expect(screen.getByTestId("bot-detection-widget")).toBeInTheDocument();
  });
}

function confirmedBooking() {
  return {
    booking: {
      durationMinutes: 30,
      id: BOOKING_ID,
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
