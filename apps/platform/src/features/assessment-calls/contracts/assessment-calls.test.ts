import { describe, expect, it } from "vitest";

import {
  bookAssessmentCallErrorSchema,
  bookAssessmentCallResponseSchema,
  bookingSchema,
  coachAssessmentCallSchema,
  coachAssessmentCallsSchema,
  createBookAssessmentCallRequestSchema,
  openSlotsResponseSchema,
  phoneFromRequest,
} from "./assessment-calls";

const ERROR_MESSAGE_SENTINEL = "opaque-error";
const NOW = new Date("2026-09-21T18:00:00.000Z");
const VALID_REQUEST = {
  startsAt: "2026-10-01T14:00:00.000Z",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phoneCallingCode: "RO",
  phoneNumber: "0712 345 678",
  notes: "Training three times a week.",
  visitorTimeZone: "Europe/Bucharest",
};
const COACH_CALL = {
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  firstName: "Ana",
  lastName: "Popescu",
  fullName: "Ana Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: "2026-10-01T14:00:00.000Z",
  endsAt: "2026-10-01T14:30:00.000Z",
  joinPath: "/book/4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11/join",
};

const bookAssessmentCallRequestSchema = createBookAssessmentCallRequestSchema({
  now: NOW,
});

function firstIssuePath(request: Record<string, unknown>) {
  const result = bookAssessmentCallRequestSchema.safeParse(request);

  return result.success ? null : result.error.issues[0]?.path;
}

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

describe("createBookAssessmentCallRequestSchema", () => {
  it("normalizes the visitor's names, email and notes at the request boundary", () => {
    // arrange
    const request = {
      ...VALID_REQUEST,
      firstName: "  Ana  ",
      lastName: "  Popescu ",
      email: "  ANA@Example.COM  ",
      notes: "  Training three times a week.  ",
    };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      startsAt: VALID_REQUEST.startsAt,
      firstName: "Ana",
      lastName: "Popescu",
      email: "ana@example.com",
      dateOfBirth: "1994-03-14",
      gender: "female",
      primaryGoal: "build_strength",
      country: "RO",
      phoneCallingCode: "RO",
      phoneNumber: "0712 345 678",
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

  it("accepts a booking without a phone number", () => {
    // arrange
    const { phoneCallingCode, phoneNumber, ...requestWithoutPhone } =
      VALID_REQUEST;

    // act
    const result =
      bookAssessmentCallRequestSchema.safeParse(requestWithoutPhone);

    // assert
    expect([phoneCallingCode, phoneNumber]).toEqual(["RO", "0712 345 678"]);
    expect(result.success).toBe(true);
  });

  it("accepts a calling code chosen without a number", () => {
    // arrange
    const request = { ...VALID_REQUEST, phoneNumber: "   " };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
  });

  it.each([
    ["an empty first name", { firstName: "   " }, ["firstName"]],
    [
      "a first name over 60 characters",
      { firstName: "a".repeat(61) },
      ["firstName"],
    ],
    ["an empty last name", { lastName: "" }, ["lastName"]],
    [
      "a last name over 60 characters",
      { lastName: "a".repeat(61) },
      ["lastName"],
    ],
    ["an unknown gender", { gender: "woman" }, ["gender"]],
    [
      "an unknown primary goal",
      { primaryGoal: "run_marathon" },
      ["primaryGoal"],
    ],
    ["a country code off the list", { country: "XX" }, ["country"]],
    ["a lowercase country code", { country: "ro" }, ["country"]],
    ["a malformed birth date", { dateOfBirth: "14/03/1994" }, ["dateOfBirth"]],
    [
      "an impossible birth date",
      { dateOfBirth: "1994-02-30" },
      ["dateOfBirth"],
    ],
    [
      "a birth date in the future",
      { dateOfBirth: "2027-01-01" },
      ["dateOfBirth"],
    ],
    [
      "a visitor older than 120",
      { dateOfBirth: "1905-09-21" },
      ["dateOfBirth"],
    ],
    [
      "a phone number with letters",
      { phoneNumber: "0712 CALL" },
      ["phoneNumber"],
    ],
    ["a phone number too short", { phoneNumber: "123" }, ["phoneNumber"]],
    [
      "a phone number too long",
      { phoneNumber: "123456789012345" },
      ["phoneNumber"],
    ],
    [
      "a phone number without a calling code",
      { phoneCallingCode: undefined },
      ["phoneNumber"],
    ],
    [
      "a phone number with a calling code off the list",
      { phoneCallingCode: "XX" },
      ["phoneNumber"],
    ],
  ])("rejects %s", (_scenario, override, path) => {
    // arrange
    const request = { ...VALID_REQUEST, ...override };

    // act
    const issuePath = firstIssuePath(request);

    // assert
    expect(issuePath).toEqual(path);
  });

  it("accepts names of exactly 60 characters", () => {
    // arrange
    const request = {
      ...VALID_REQUEST,
      firstName: "a".repeat(60),
      lastName: "b".repeat(60),
    };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
  });

  it("accepts a visitor who turns 120 today", () => {
    // arrange
    const request = { ...VALID_REQUEST, dateOfBirth: "1906-09-21" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(true);
  });

  it("accepts a visitor on her eighteenth birthday in her own zone", () => {
    // arrange
    const lateEveningUtc = createBookAssessmentCallRequestSchema({
      now: new Date("2026-09-21T22:30:00.000Z"),
    });
    const request = {
      ...VALID_REQUEST,
      dateOfBirth: "2008-09-22",
      visitorTimeZone: "Pacific/Kiritimati",
    };

    // act
    const result = lateEveningUtc.safeParse(request);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects a visitor the day before her eighteenth birthday in her own zone", () => {
    // arrange
    const lateEveningUtc = createBookAssessmentCallRequestSchema({
      now: new Date("2026-09-21T22:30:00.000Z"),
    });
    const request = {
      ...VALID_REQUEST,
      dateOfBirth: "2008-09-22",
      visitorTimeZone: "America/Los_Angeles",
    };

    // act
    const result = lateEveningUtc.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dateOfBirth"]);
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

  it("stores the canonical spelling of a time zone sent in another case", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "eUrOpE/bUcHaReSt" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.data?.visitorTimeZone).toBe("Europe/Bucharest");
  });

  it("keeps a time zone that is already canonical", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "America/New_York" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.data?.visitorTimeZone).toBe("America/New_York");
  });

  it("rejects a time zone the runtime does not know, without faulting on the age check", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "Mars/Olympus_Mons" };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["visitorTimeZone"],
    ]);
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

  it("rejects a time zone longer than the stored column, before it is ever formatted", () => {
    // arrange
    const request = { ...VALID_REQUEST, visitorTimeZone: "E".repeat(65) };

    // act
    const result = bookAssessmentCallRequestSchema.safeParse(request);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["visitorTimeZone"]);
    expect(result.error?.issues[0]?.code).toBe("too_big");
  });

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

describe("phoneFromRequest", () => {
  it("resolves the calling code from the chosen country and stores the number in E.164", () => {
    // arrange
    const request = { phoneCallingCode: "RO", phoneNumber: "(0712) 345-678" };

    // act
    const phone = phoneFromRequest(request);

    // assert
    expect(phone).toBe("+40712345678");
  });

  it("stores no phone when the number is left blank", () => {
    // arrange
    const request = { phoneCallingCode: "RO", phoneNumber: "  " };

    // act
    const phone = phoneFromRequest(request);

    // assert
    expect(phone).toBeNull();
  });

  it("stores no phone when neither part was sent", () => {
    // arrange
    const request = {};

    // act
    const phone = phoneFromRequest(request);

    // assert
    expect(phone).toBeNull();
  });
});

describe("bookingSchema", () => {
  it("publishes the booked call with its fixed duration", () => {
    // arrange
    const booking = {
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      startsAt: "2026-10-01T14:00:00.000Z",
      durationMinutes: 30,
      visitorTimeZone: "Europe/Bucharest",
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
      },
    };

    // act
    const result = bookAssessmentCallResponseSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it.each([
    "invalid_first_name",
    "invalid_last_name",
    "invalid_email",
    "invalid_date_of_birth",
    "invalid_gender",
    "invalid_primary_goal",
    "invalid_country",
    "invalid_phone",
    "notes_too_long",
    "invalid_time_zone",
    "invalid_start",
    "slot_unavailable",
    "booking_refused",
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

  it("publishes no booking alongside a refusal, however a caller shapes one", () => {
    // arrange
    const response = {
      success: false,
      error: {
        code: "booking_refused",
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
    expect(result.data?.error).toEqual({
      code: "booking_refused",
      message: ERROR_MESSAGE_SENTINEL,
    });
  });

  it.each(["email_already_booked", "invalid_name", "slot_taken"])(
    "rejects %s, a code the booking API no longer answers with",
    (code) => {
      // arrange
      const response = {
        success: false,
        error: { code, message: ERROR_MESSAGE_SENTINEL },
      };

      // act
      const result = bookAssessmentCallResponseSchema.safeParse(response);

      // assert
      expect(result.success).toBe(false);
    },
  );

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

describe("coachAssessmentCallSchema", () => {
  it("publishes a booked call with the visitor's profile and the join path the coach follows", () => {
    // arrange
    const call = COACH_CALL;

    // act
    const result = coachAssessmentCallSchema.safeParse(call);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(call);
  });

  it("publishes a call the visitor left no notes or phone on", () => {
    // arrange
    const call = { ...COACH_CALL, phone: null, visitorNotes: null };

    // act
    const result = coachAssessmentCallSchema.safeParse(call);

    // assert
    expect(result.success).toBe(true);
    expect(result.data?.visitorNotes).toBeNull();
    expect(result.data?.phone).toBeNull();
  });

  it.each([
    [
      "an end that is not an ISO instant",
      { endsAt: "2026-10-01 14:30" },
      "endsAt",
    ],
    [
      "a birth date that is not a calendar date",
      { dateOfBirth: "14 March 1994" },
      "dateOfBirth",
    ],
    ["an unknown gender", { gender: "woman" }, "gender"],
    ["an unknown primary goal", { primaryGoal: "run" }, "primaryGoal"],
    ["a country code that is not two letters", { country: "ROU" }, "country"],
    ["a missing full name", { fullName: "" }, "fullName"],
  ])("rejects %s", (_scenario, override, field) => {
    // arrange
    const call = { ...COACH_CALL, ...override };

    // act
    const result = coachAssessmentCallSchema.safeParse(call);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });
});

describe("coachAssessmentCallsSchema", () => {
  it("publishes the coach's calls beside her time zone and the server instant", () => {
    // arrange
    const dashboard = {
      calls: [COACH_CALL],
      coachTimeZone: "Europe/Bucharest",
      now: "2026-09-30T08:00:00.000Z",
    };

    // act
    const result = coachAssessmentCallsSchema.safeParse(dashboard);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(dashboard);
  });

  it("publishes a coach with no calls booked", () => {
    // arrange
    const dashboard = {
      calls: [],
      coachTimeZone: "Europe/Bucharest",
      now: "2026-09-30T08:00:00.000Z",
    };

    // act
    const result = coachAssessmentCallsSchema.safeParse(dashboard);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects a dashboard without the instant it was read at", () => {
    // arrange
    const dashboard = { calls: [], coachTimeZone: "Europe/Bucharest" };

    // act
    const result = coachAssessmentCallsSchema.safeParse(dashboard);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["now"]);
  });
});
