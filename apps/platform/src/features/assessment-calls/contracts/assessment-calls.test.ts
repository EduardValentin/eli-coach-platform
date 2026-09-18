import { describe, expect, it } from "vitest";

import {
  bookAssessmentCallErrorSchema,
  bookAssessmentCallRequestSchema,
  bookAssessmentCallResponseSchema,
  bookingSchema,
  openSlotsResponseSchema,
} from "./assessment-calls";

const ERROR_MESSAGE_SENTINEL = "opaque-error";
const VALID_REQUEST = {
  startsAt: "2026-10-01T14:00:00.000Z",
  fullName: "Ana Popescu",
  email: "ana@example.com",
  notes: "Training three times a week.",
  visitorTimeZone: "Europe/Bucharest",
};

describe("openSlotsResponseSchema", () => {
  it("publishes open slots as ISO instants alongside the coach time zone", () => {
    // arrange
    const response = {
      coachTimeZone: "Europe/Bucharest",
      slots: ["2026-10-01T14:00:00.000Z", "2026-10-01T15:00:00.000Z"],
    };

    // act
    const result = openSlotsResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(response);
  });

  it("accepts a coach with no open slots", () => {
    // arrange
    const response = { coachTimeZone: "Europe/Bucharest", slots: [] };

    // act
    const result = openSlotsResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects a slot that is not an ISO instant", () => {
    // arrange
    const response = {
      coachTimeZone: "Europe/Bucharest",
      slots: ["2026-10-01 14:00"],
    };

    // act
    const result = openSlotsResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });

  it("rejects a missing coach time zone", () => {
    // arrange
    const response = { slots: [] };

    // act
    const result = openSlotsResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });
});

describe("bookAssessmentCallRequestSchema", () => {
  it("normalizes the visitor name and email at the request boundary", () => {
    // arrange
    const request = {
      ...VALID_REQUEST,
      fullName: "  Ana Popescu  ",
      email: "  ANA@Example.COM  ",
      notes: "  Training three times a week.  ",
    };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      startsAt: VALID_REQUEST.startsAt,
      fullName: "Ana Popescu",
      email: "ana@example.com",
      notes: "Training three times a week.",
      visitorTimeZone: "Europe/Bucharest",
    });
  });

  it("accepts a booking without notes", () => {
    // arrange
    const { notes, ...requestWithoutNotes } = VALID_REQUEST;

    // act
    const result =
      bookAssessmentCallRequestSchema.safeParse(requestWithoutNotes);

    // assert
    expect(notes).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data?.notes).toBeUndefined();
  });

  it("rejects a name shorter than two characters once trimmed", () => {
    // arrange
    const request = { ...VALID_REQUEST, fullName: " A " };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["fullName"]);
  });

  it("rejects a name longer than 120 characters", () => {
    // arrange
    const request = { ...VALID_REQUEST, fullName: "a".repeat(121) };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
  });

  it("rejects an invalid or overly long email", () => {
    // arrange
    const invalidRequest = { ...VALID_REQUEST, email: "not-an-email" };
    const overlyLongRequest = {
      ...VALID_REQUEST,
      email: `${"a".repeat(310)}@example.com`,
    };

    // act
    const invalidResult =
      bookAssessmentCallRequestSchema.safeParse(invalidRequest);
    const longResult =
      bookAssessmentCallRequestSchema.safeParse(overlyLongRequest);

    // assert
    expect(invalidResult.success).toBe(false);
    expect(longResult.success).toBe(false);
  });

  it("rejects notes longer than 1000 characters", () => {
    // arrange
    const request = { ...VALID_REQUEST, notes: "a".repeat(1001) };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["notes"]);
  });

  it("rejects a time zone the runtime does not know", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "Mars/Olympus_Mons" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["visitorTimeZone"]);
  });

  it.each(["UTC", "Etc/UTC", "GMT", "Asia/Calcutta", "Europe/Kiev"])(
    "accepts %s, which browsers report but the canonical zone list omits",
    (visitorTimeZone) => {
      // arrange
      const request = { ...VALID_REQUEST, visitorTimeZone };

      // act
      const result = bookAssessmentCallRequestSchema.safeParse(request);

      // assert
      expect(result.success).toBe(true);
    },
  );

  it("rejects an empty time zone", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["visitorTimeZone"]);
  });

  it("rejects a start that is not an ISO instant", () => {
    // arrange
    const request = { ...VALID_REQUEST, startsAt: "2026-10-01 14:00" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["startsAt"]);
  });
});

describe("bookingSchema", () => {
  it("publishes the booked call with its fixed duration and join path", () => {
    // arrange
    const booking = {
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      startsAt: "2026-10-01T14:00:00.000Z",
      durationMinutes: 30,
      visitorTimeZone: "Europe/Bucharest",
      joinPath: "/book/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/join",
    };

    // act
    const result = bookingSchema.safeParse(booking);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(booking);
  });

  it("rejects a duration other than the fixed assessment call length", () => {
    // arrange
    const booking = {
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      startsAt: "2026-10-01T14:00:00.000Z",
      durationMinutes: 45,
      visitorTimeZone: "Europe/Bucharest",
      joinPath: "/book/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/join",
    };

    // act
    const result = bookingSchema.safeParse(booking);

    // assert
    expect(result.success).toBe(false);
  });
});

describe("bookAssessmentCallResponseSchema", () => {
  it("parses a successful booking response", () => {
    // arrange
    const response = {
      success: true,
      booking: {
        id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
        startsAt: "2026-10-01T14:00:00.000Z",
        durationMinutes: 30,
        visitorTimeZone: "Europe/Bucharest",
        joinPath: "/book/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/join",
      },
    };

    // act
    const result = bookAssessmentCallResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it.each([
    "invalid_name",
    "invalid_email",
    "notes_too_long",
    "invalid_time_zone",
    "invalid_start",
    "slot_unavailable",
    "email_already_booked",
    "bot_verification_failed",
    "server_error",
  ] as const)("accepts %s as a booking error outcome", (code) => {
    // arrange
    const response = {
      success: false,
      error: { code, message: ERROR_MESSAGE_SENTINEL },
    };

    // act
    const result = bookAssessmentCallResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it("carries the existing call when the email already has an upcoming booking", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "email_already_booked",
        message: ERROR_MESSAGE_SENTINEL,
        existing: {
          startsAt: "2026-10-02T14:00:00.000Z",
          joinPath: "/book/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/join",
        },
      },
    };

    // act
    const result = bookAssessmentCallErrorSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
    expect(result.data?.error.existing?.startsAt).toBe(
      "2026-10-02T14:00:00.000Z",
    );
  });

  it("rejects an unknown booking error code", () => {
    // arrange
    const response = {
      success: false,
      error: { code: "slot_taken", message: ERROR_MESSAGE_SENTINEL },
    };

    // act
    const result = bookAssessmentCallResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });

  it("rejects an empty public error message", () => {
    // arrange
    const response = {
      success: false,
      error: { code: "server_error", message: "" },
    };

    // act
    const result = bookAssessmentCallResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });
});
