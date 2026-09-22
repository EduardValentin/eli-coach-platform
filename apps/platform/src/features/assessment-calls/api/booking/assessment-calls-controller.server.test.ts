import {
  AssessmentCall,
  type BookAssessmentCallResult,
  type BookAssessmentCallUseCase,
  type JoinLinkResult,
  type ListOpenSlotsUseCase,
  type OpenSlotsResult,
  type ResolveJoinLinkUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type { BotVerifier } from "@eli-coach-platform/infrastructure/bot-detection/server";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import { describe, expect, it, vi } from "vitest";

import { bookAssessmentCallResponseSchema } from "~/features/assessment-calls/contracts/assessment-calls";

import { AssessmentCallsController } from "./assessment-calls-controller.server";

type ControllerOptions = {
  bookings?: BookAssessmentCallResult;
  joinLink?: JoinLinkResult;
  now?: Date;
  openSlots?: OpenSlotsResult;
  verification?: BotVerificationResult;
};

type BotVerificationResult = Awaited<
  ReturnType<BotVerifier["verifySubmission"]>
>;

const NOW = new Date("2026-10-19T08:00:00.000Z");
const botDetection: BotDetectionConfig = {
  provider: "static",
  token: "XXXX.DUMMY.TOKEN.XXXX",
};
const bookedCall = AssessmentCall.reconstitute({
  id: "3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: new Date("2026-10-19T14:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-10-19T08:00:00.000Z"),
});
const bookingConfirmed: BookAssessmentCallResult = {
  status: "booked",
  call: bookedCall,
};

describe("AssessmentCallsController booking page", () => {
  it("hides the booking page while booking is closed", async () => {
    // arrange
    const { controller } = createController({
      openSlots: { status: "closed" },
    });

    // act
    const loading = controller.loadBookingPage();

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("serialises open slots with the bot detection the page renders", async () => {
    // arrange
    const { controller } = createController({
      openSlots: {
        status: "open",
        coachTimeZone: "Europe/Bucharest",
        slots: [new Date("2026-10-19T14:00:00.000Z")],
      },
    });

    // act
    const page = await controller.loadBookingPage();

    // assert
    expect(page).toEqual({
      botDetection,
      coachTimeZone: "Europe/Bucharest",
      slots: ["2026-10-19T14:00:00.000Z"],
      status: "open",
    });
  });

  it("lets a fault in working out the slots reach the framework's error page", async () => {
    // arrange
    const { controller, listSlots } = createController({});
    const fault = new Error("slot arithmetic failed");
    listSlots.mockRejectedValue(fault);

    // act
    const loading = controller.loadBookingPage();

    // assert
    await expect(loading).rejects.toBe(fault);
  });

  it("reports unreadable availability to the page", async () => {
    // arrange
    const { controller } = createController({
      openSlots: { status: "unavailable" },
    });

    // act
    const page = await controller.loadBookingPage();

    // assert
    expect(page).toEqual({ botDetection, status: "unavailable" });
  });
});

describe("AssessmentCallsController slots endpoint", () => {
  it("hides the slots endpoint while booking is closed", async () => {
    // arrange
    const { controller } = createController({
      openSlots: { status: "closed" },
    });

    // act
    const response = await controller.listSlots();

    // assert
    expect(response.status).toBe(404);
  });

  it("answers open slots without allowing them to be cached", async () => {
    // arrange
    const { controller } = createController({
      openSlots: {
        status: "open",
        coachTimeZone: "Europe/Bucharest",
        slots: [new Date("2026-10-19T14:00:00.000Z")],
      },
    });

    // act
    const response = await controller.listSlots();

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      coachTimeZone: "Europe/Bucharest",
      slots: ["2026-10-19T14:00:00.000Z"],
    });
  });

  it("lets a fault in working out the slots reach the framework instead of posing as unavailability", async () => {
    // arrange
    const { controller, listSlots } = createController({});
    const fault = new Error("slot arithmetic failed");
    listSlots.mockRejectedValue(fault);

    // act
    const listing = controller.listSlots();

    // assert
    await expect(listing).rejects.toBe(fault);
  });

  it("answers unreadable availability as a temporary failure", async () => {
    // arrange
    const { controller } = createController({
      openSlots: { status: "unavailable" },
    });

    // act
    const response = await controller.listSlots();

    // assert
    expect(response.status).toBe(503);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "server_error" },
    });
  });
});

describe("AssessmentCallsController booking submissions", () => {
  it("books with the request feature flag context", async () => {
    // arrange
    const { book, controller } = createController({});
    const evaluation = { overrides: { WAITLIST_MODE: false } };

    // act
    await controller.book(createBookingRequest(), evaluation);

    // assert
    expect(book).toHaveBeenCalledWith(expect.any(Object), evaluation);
  });

  it.each([
    ["firstName", "   ", "invalid_first_name"],
    ["lastName", "x".repeat(61), "invalid_last_name"],
    ["email", "not-an-email", "invalid_email"],
    ["dateOfBirth", "2010-10-19", "invalid_date_of_birth"],
    ["gender", "woman", "invalid_gender"],
    ["primaryGoal", "run_marathon", "invalid_primary_goal"],
    ["country", "XX", "invalid_country"],
    ["phoneNumber", "0712 CALL", "invalid_phone"],
    ["notes", "x".repeat(1001), "notes_too_long"],
    ["visitorTimeZone", "Mars/Olympus_Mons", "invalid_time_zone"],
    ["startsAt", "not-a-date", "invalid_start"],
  ])(
    "rejects an invalid %s before anything is booked",
    async (field, value, code) => {
      // arrange
      const { book, controller } = createController({});

      // act
      const response = await controller.book(
        createBookingRequest({ [field]: value }),
      );

      // assert
      expect(response.status).toBe(400);
      await expect(readBody(response)).resolves.toMatchObject({
        success: false,
        error: { code },
      });
      expect(book).not.toHaveBeenCalled();
    },
  );

  it("stores nothing when bot verification rejects the submission", async () => {
    // arrange
    const { book, controller } = createController({
      verification: { status: "rejected" },
    });

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    expect(response.status).toBe(400);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
    expect(book).not.toHaveBeenCalled();
  });

  it("stores nothing when bot verification cannot be reached", async () => {
    // arrange
    const { book, controller } = createController({
      verification: { status: "unavailable" },
    });

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    expect(response.status).toBe(500);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "server_error" },
    });
    expect(book).not.toHaveBeenCalled();
  });

  it("judges the visitor's age on the server's clock, not the wall clock", async () => {
    // arrange
    const { book, controller } = createController({
      now: new Date("2012-10-19T08:00:00.000Z"),
    });

    // act
    const response = await controller.book(
      createBookingRequest({ dateOfBirth: "1994-10-20" }),
    );

    // assert
    expect(response.status).toBe(400);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "invalid_date_of_birth" },
    });
    expect(book).not.toHaveBeenCalled();
  });

  it("confirms a booking with the link the visitor joins from", async () => {
    // arrange
    const { book, controller } = createController({});

    // act
    const response = await controller.book(
      createBookingRequest({ notes: "  Training three times a week.  " }),
    );

    // assert
    expect(response.status).toBe(201);
    await expect(readBody(response)).resolves.toEqual({
      success: true,
      booking: {
        durationMinutes: 30,
        id: bookedCall.id,
        startsAt: "2026-10-19T14:00:00.000Z",
        visitorTimeZone: "Europe/Bucharest",
      },
    });
    expect(book).toHaveBeenCalledWith(
      {
        country: "RO",
        dateOfBirth: "1994-03-14",
        email: "ana@example.com",
        firstName: "Ana",
        gender: "female",
        lastName: "Popescu",
        notes: "Training three times a week.",
        phone: "+40712345678",
        primaryGoal: "build_strength",
        startsAt: new Date("2026-10-19T14:00:00.000Z"),
        visitorTimeZone: "Europe/Bucharest",
      },
      undefined,
    );
  });

  it("stores no phone when the number is left blank", async () => {
    // arrange
    const { book, controller } = createController({});

    // act
    await controller.book(createBookingRequest({ phoneNumber: "  " }));

    // assert
    expect(book).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
      undefined,
    );
  });

  it("stores no phone when neither phone field is sent", async () => {
    // arrange
    const { book, controller } = createController({});

    // act
    await controller.book(
      createBookingRequest({}, ["phoneCountry", "phoneNumber"]),
    );

    // assert
    expect(book).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
      undefined,
    );
  });

  it("stores the phone in E.164 under the chosen calling code", async () => {
    // arrange
    const { book, controller } = createController({});

    // act
    await controller.book(
      createBookingRequest({
        phoneCountry: "GB",
        phoneNumber: "(07700) 900-123",
      }),
    );

    // assert
    expect(book).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+447700900123" }),
      undefined,
    );
  });

  it("names a blank note as no note at all", async () => {
    // arrange
    const { book, controller } = createController({});

    // act
    await controller.book(createBookingRequest({ notes: "   " }));

    // assert
    expect(book).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null }),
      undefined,
    );
  });

  it("verifies the submission before anything is booked", async () => {
    // arrange
    const { controller, verify } = createController({});

    // act
    await controller.book(createBookingRequest());

    // assert
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({ action: "assessment_call_booking" }),
    );
  });

  it("hides the booking endpoint while booking is closed", async () => {
    // arrange
    const { controller } = createController({ bookings: { status: "closed" } });

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    expect(response.status).toBe(404);
  });

  it("reports a slot taken while the visitor was filling in their details", async () => {
    // arrange
    const { controller } = createController({
      bookings: { status: "slot_unavailable" },
    });

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    expect(response.status).toBe(409);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
  });

  it("refuses a repeat email without revealing whether or when that address holds a call", async () => {
    // arrange
    const { controller } = createController({
      bookings: { status: "email_already_booked" },
    });

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({
      success: false,
      error: {
        code: "booking_refused",
        message: expect.any(String),
      },
    });
    expect(text).not.toContain(bookedCall.id);
    expect(text).not.toContain("2026-10-19");
    expect(text).not.toContain("/join");
    expect(text).not.toMatch(/already|booked|upcoming/i);
  });

  it("answers a failed booking as a server error", async () => {
    // arrange
    const { book, controller } = createController({});
    book.mockRejectedValue(new Error("database down"));

    // act
    const response = await controller.book(createBookingRequest());

    // assert
    expect(response.status).toBe(500);
    await expect(readBody(response)).resolves.toMatchObject({
      success: false,
      error: { code: "server_error" },
    });
  });
});

describe("AssessmentCallsController join links", () => {
  it("answers the meeting room of a known booking", async () => {
    // arrange
    const { controller } = createController({
      joinLink: { status: "found", url: "https://meet.example/eli" },
    });

    // act
    const resolved = await controller.resolveJoin(bookedCall.id);

    // assert
    expect(resolved).toEqual({
      status: "found",
      url: "https://meet.example/eli",
    });
  });

  it("keeps an unknown booking indistinguishable from any other", async () => {
    // arrange
    const { controller } = createController({
      joinLink: { status: "unknown" },
    });

    // act
    const resolved = await controller.resolveJoin("not-a-booking");

    // assert
    expect(resolved).toEqual({ status: "unknown" });
  });
});

function createController(options: ControllerOptions) {
  const book = vi.fn().mockResolvedValue(options.bookings ?? bookingConfirmed);
  const listSlots = vi.fn().mockResolvedValue(
    options.openSlots ?? {
      status: "open",
      coachTimeZone: "Europe/Bucharest",
      slots: [],
    },
  );
  const resolveJoin = vi
    .fn()
    .mockResolvedValue(options.joinLink ?? { status: "unknown" });
  const verify = vi
    .fn()
    .mockResolvedValue(options.verification ?? { status: "verified" });

  return {
    book,
    controller: new AssessmentCallsController({
      botDetection,
      botVerifier: { verifySubmission: verify },
      bookAssessmentCall: {
        execute: book,
      } as unknown as BookAssessmentCallUseCase,
      clock: { now: () => options.now ?? NOW },
      listOpenSlots: { execute: listSlots } as unknown as ListOpenSlotsUseCase,
      resolveJoinLink: {
        execute: resolveJoin,
      } as unknown as ResolveJoinLinkUseCase,
    }),
    listSlots,
    verify,
  };
}

function createBookingRequest(
  overrides: Record<string, string> = {},
  omitted: readonly string[] = [],
): Request {
  const body = new URLSearchParams({
    country: "RO",
    dateOfBirth: "1994-03-14",
    email: "  ANA@example.com ",
    firstName: " Ana ",
    gender: "female",
    lastName: " Popescu ",
    phoneCountry: "RO",
    phoneNumber: "0712 345 678",
    primaryGoal: "build_strength",
    startsAt: "2026-10-19T14:00:00.000Z",
    visitorTimeZone: "Europe/Bucharest",
    ...overrides,
  });

  for (const field of omitted) {
    body.delete(field);
  }

  return new Request("http://localhost/api/assessment-calls", {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
}

async function readBody(response: Response) {
  return bookAssessmentCallResponseSchema.parse(await response.json());
}
