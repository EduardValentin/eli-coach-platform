import { ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  bookAssessmentCallResponseSchema,
  openSlotsResponseSchema,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

type AssessmentCallRow = {
  id: string;
  firstName: string;
  lastName: string;
  visitorEmail: string;
  visitorNotes: string | null;
  dateOfBirth: string;
  gender: string;
  primaryGoal: string;
  country: string;
  phone: string | null;
  startsAt: Date;
  visitorTimeZone: string;
  coachTimeZone: string;
  bookedAt: Date;
};

type CoachTimeReservationRow = {
  startsAt: Date;
  endsAt: Date;
  appointmentKind: string;
  appointmentId: string;
};

const COACH_EMAIL = "coach@evoa.fit";
const PRODUCT_EMAIL_REPLY_TO = "replies@evoa.fit";
const MEETING_LINK = "https://meet.example/eli-assessment-room";
const VISITOR_EMAIL = "ana@example.com";
const VISITOR_NAME = "Ana Popescu";
const VISITOR_TIME_ZONE = "Europe/London";
const COACH_SESSION = {
  sessionId: "sess_bookingcoachsession",
  subjectId: "user_bookingcoachsubject",
};

const suite = new ApiIntegrationTestSuite({
  environment: {
    ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL,
    BOOTSTRAP_COACH_AUTH_SUBJECT_ID: COACH_SESSION.subjectId,
    PRODUCT_EMAIL_REPLY_TO,
  },
});
const bookingToken = turnstileTokenForAction(
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
);

const MONDAY_MORNING = new Date("2026-10-19T08:00:00.000Z");
const MONDAY_AFTERNOON = new Date("2026-10-19T12:30:00.000Z");
const TUESDAY_MORNING = new Date("2026-10-20T08:00:00.000Z");
const FIRST_EVENING_START = "2026-10-19T14:00:00.000Z";
const SECOND_EVENING_START = "2026-10-19T15:00:00.000Z";
const NEXT_DAY_EVENING_START = "2026-10-20T14:00:00.000Z";
const WINTER_TIME_EVENING_START = "2026-10-26T15:00:00.000Z";
const LAST_HORIZON_START = "2026-11-18T17:00:00.000Z";
const CHECK_VIOLATION = "23514";
const UNKNOWN_BOOKING_ID = "00000000-0000-4000-8000-000000000000";
const MALFORMED_BOOKING_ID = "not-a-booking";

describe.sequential("assessment call booking integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    await switchWaitlistModeOff();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("offers the coach's evening starts across the booking horizon", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestSlots();

    // assert
    const body = openSlotsResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.coachTimeZone).toBe("Europe/Bucharest");
    expect(body.slots.slice(0, 3)).toEqual([
      FIRST_EVENING_START,
      SECOND_EVENING_START,
      "2026-10-19T16:00:00.000Z",
    ]);
    expect(body.slots).toContain(WINTER_TIME_EVENING_START);
    expect(body.slots.at(-1)).toBe(LAST_HORIZON_START);
    expect(body.slots).toHaveLength(69);
  });

  it("leaves out a start that falls inside the booking lead time", async () => {
    // arrange
    await suite.setServerClock(MONDAY_AFTERNOON);

    // act
    const response = await requestSlots();

    // assert
    const body = openSlotsResponseSchema.parse(await response.json());

    expect(body.slots).not.toContain(FIRST_EVENING_START);
    expect(body.slots[0]).toBe(SECOND_EVENING_START);
  });

  it("serves the booking page while booking is open", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBookingPage();

    // assert
    const document = await response.text();

    expect(response.status).toBe(200);
    expect(document).toContain("Free Call");
    expect(document).toContain("Select a Date &amp; Time");
  });

  it("stores the visitor's profile with the booking in both time zones and notifies both sides", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({
      notes: "  Training three times a week.  ",
    });

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    if (!body.success) {
      throw new Error(`Expected a confirmed booking: ${body.error.code}.`);
    }

    const rows = await readCalls();
    const [row] = rows;

    expect(response.status).toBe(201);
    expect(body.booking).toMatchObject({
      durationMinutes: 30,
      startsAt: FIRST_EVENING_START,
      visitorTimeZone: VISITOR_TIME_ZONE,
    });
    expect(rows).toHaveLength(1);
    expect(row).toMatchObject({
      coachTimeZone: "Europe/Bucharest",
      country: "RO",
      dateOfBirth: "1994-03-14",
      firstName: "Ana",
      gender: "female",
      id: body.booking.id,
      lastName: "Popescu",
      phone: "+40712345678",
      primaryGoal: "build_strength",
      visitorEmail: VISITOR_EMAIL,
      visitorNotes: "Training three times a week.",
      visitorTimeZone: VISITOR_TIME_ZONE,
    });
    expect(row?.startsAt).toEqual(new Date(FIRST_EVENING_START));
    expect(row?.bookedAt).toEqual(MONDAY_MORNING);

    await expect.poll(async () => (await suite.sentEmails()).length).toBe(2);

    const emails = await suite.sentEmails();
    const visitorEmail = emails.find((email) => email.to === VISITOR_EMAIL);
    const coachEmail = emails.find((email) => email.to === COACH_EMAIL);
    expect(coachEmail?.replyTo).toBe(VISITOR_EMAIL);
    expect(visitorEmail?.replyTo).toBe(PRODUCT_EMAIL_REPLY_TO);

    const joinUrl = `https://localhost:3000/eli-coach-platform/book/${body.booking.id}/join`;

    expect(visitorEmail?.text).toContain("Hi Ana,");
    expect(visitorEmail?.text).toContain("3:00 PM");
    expect(visitorEmail?.text).toContain(VISITOR_TIME_ZONE);
    expect(visitorEmail?.text).toContain(joinUrl);
    expect(visitorEmail?.text).toContain(
      "https://calendar.google.com/calendar/render",
    );
    expect(coachEmail?.text).toContain(`WHO: ${VISITOR_NAME}`);
    expect(coachEmail?.text).toContain("PHONE: +40712345678");
    expect(coachEmail?.text).toContain("AGE: 32 (born 14 March 1994)");
    expect(coachEmail?.text).toContain("GENDER: Female");
    expect(coachEmail?.text).toContain("GOAL: Build strength");
    expect(coachEmail?.text).toContain("COUNTRY: Romania");
    expect(coachEmail?.html).toContain('href="tel:+40712345678"');
    expect(coachEmail?.text).toContain("5:00 PM");
    expect(coachEmail?.text).toContain("Europe/Bucharest");
    expect(coachEmail?.text).toContain(joinUrl);

    const invite = visitorEmail?.attachments.at(0);

    expect(invite?.filename).toBe("invite.ics");
    expect(invite?.contentText).toContain("DTSTART:20261019T140000Z");
    expect(invite?.contentText).toContain(
      `UID:${body.booking.id}@localhost:3000`,
    );
    expect(invite?.contentText).toContain("DTSTAMP:20261019T080000Z");
    expect(coachEmail?.attachments.at(0)?.filename).toBe("invite.ics");
  });

  it("stores no phone when the visitor leaves the number blank", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({ phoneNumber: "" });

    // assert
    const [row] = await readCalls();

    expect(response.status).toBe(201);
    expect(row?.phone).toBeNull();

    await expect.poll(async () => (await suite.sentEmails()).length).toBe(2);

    const coachEmail = (await suite.sentEmails()).find(
      (email) => email.to === COACH_EMAIL,
    );

    expect(coachEmail?.text).not.toContain("PHONE:");
  });

  it.each([
    { column: "gender", constraint: "assessment_calls_gender_check" },
    {
      column: "primary_goal",
      constraint: "assessment_calls_primary_goal_check",
    },
  ])(
    "refuses a $column outside its vocabulary at the database",
    async ({ column, constraint }) => {
      // arrange
      const columns = {
        gender: "female",
        primary_goal: "build_strength",
        [column]: "unknown",
      };

      // act
      const insert = insertCallDirectly(columns);

      // assert
      await expect(insert).rejects.toMatchObject({
        code: CHECK_VIOLATION,
        constraint,
      });
      expect(await readCalls()).toHaveLength(0);
    },
  );

  it("declines a visitor under eighteen without storing anything", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({ dateOfBirth: "2008-10-20" });

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "invalid_date_of_birth" },
    });
    expect(await readCalls()).toHaveLength(0);
    expect(await readCoachTimeReservations()).toHaveLength(0);
    expect(await suite.sentEmails()).toHaveLength(0);
  });

  it("books a visitor on her eighteenth birthday in her own zone", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({ dateOfBirth: "2008-10-19" });

    // assert
    expect(response.status).toBe(201);
    expect(await readCalls()).toHaveLength(1);
  });

  it("declines a start another visitor already holds", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await requestBooking({});

    // act
    const response = await requestBooking({ email: "maria@example.com" });

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
    expect(await readCalls()).toHaveLength(1);
  });

  it("books a start for only one of two visitors who ask for it at once", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const addresses = [VISITOR_EMAIL, "maria@example.com"];

    // act
    const responses = await Promise.all(
      addresses.map((email) => requestBooking({ email })),
    );

    // assert
    const statuses = responses.map((response) => response.status);
    const winner = addresses[statuses.indexOf(201)];
    const loser = responses[statuses.indexOf(409)];
    const rows = await readCalls();

    expect([...statuses].sort()).toEqual([201, 409]);
    expect(await loser?.json()).toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.visitorEmail).toBe(winner);
    await expect.poll(async () => (await suite.sentEmails()).length).toBe(2);
    expect((await suite.sentEmails()).map((email) => email.to).sort()).toEqual(
      [COACH_EMAIL, winner].sort(),
    );
  });

  it("reserves the coach's time through the call and its buffer", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({});

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    if (!body.success) {
      throw new Error(`Expected a confirmed booking: ${body.error.code}.`);
    }

    const slots = openSlotsResponseSchema.parse(
      await (await requestSlots()).json(),
    ).slots;

    expect(await readCoachTimeReservations()).toEqual([
      {
        startsAt: new Date(FIRST_EVENING_START),
        endsAt: new Date(SECOND_EVENING_START),
        appointmentKind: "assessment_call",
        appointmentId: body.booking.id,
      },
    ]);
    expect(slots).not.toContain(FIRST_EVENING_START);
    expect(slots[0]).toBe(SECOND_EVENING_START);
  });

  it("lets the coach's reserved time settle a race between several visitors", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const addresses = [
      VISITOR_EMAIL,
      "maria@example.com",
      "ioana@example.com",
      "elena@example.com",
    ];

    // act
    const responses = await Promise.all(
      addresses.map((email) => requestBooking({ email })),
    );

    // assert
    const statuses = responses.map((response) => response.status);
    const winner = addresses[statuses.indexOf(201)];
    const losers = responses.filter((response) => response.status === 409);
    const [reservation] = await readCoachTimeReservations();
    const [call] = await readCalls();

    expect([...statuses].sort()).toEqual([201, 409, 409, 409]);
    for (const loser of losers) {
      expect(await loser.json()).toMatchObject({
        success: false,
        error: { code: "slot_unavailable" },
      });
    }
    expect(await readCoachTimeReservations()).toHaveLength(1);
    expect(await readCalls()).toHaveLength(1);
    expect(call?.visitorEmail).toBe(winner);
    expect(reservation?.appointmentId).toBe(call?.id);
  });

  it("keeps a start the coach is busy for off the list and refuses to book it", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await reserveCoachTimeDirectly({
      startsAt: "2026-10-19T14:15:00.000Z",
      endsAt: "2026-10-19T14:45:00.000Z",
      appointmentKind: "check_in",
    });

    // act
    const slotsResponse = await requestSlots();
    const bookingResponse = await requestBooking({});

    // assert
    const slots = openSlotsResponseSchema.parse(
      await slotsResponse.json(),
    ).slots;

    expect(slots).not.toContain(FIRST_EVENING_START);
    expect(slots[0]).toBe(SECOND_EVENING_START);
    expect(bookingResponse.status).toBe(409);
    expect(await bookingResponse.json()).toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
    expect(await readCalls()).toHaveLength(0);
    expect(await readCoachTimeReservations()).toHaveLength(1);
    expect(await suite.sentEmails()).toHaveLength(0);
  });

  it("refuses a start whose buffer runs into time the coach is busy for", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await reserveCoachTimeDirectly({
      startsAt: "2026-10-19T14:45:00.000Z",
      endsAt: "2026-10-19T15:00:00.000Z",
      appointmentKind: "program_review",
    });

    // act
    const refused = await requestBooking({});
    const booked = await requestBooking({ startsAt: SECOND_EVENING_START });

    // assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
    expect(booked.status).toBe(201);
    expect(await readCoachTimeReservations()).toHaveLength(2);
  });

  it("answers the holder's own repeat of a start exactly as it answers anyone else", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await requestBooking({});
    await expect.poll(async () => (await suite.sentEmails()).length).toBe(2);

    // act
    const holderRepeat = await requestBooking({});
    const otherVisitor = await requestBooking({ email: "maria@example.com" });

    // assert
    const holderText = await holderRepeat.text();

    expect(holderRepeat.status).toBe(409);
    expect(otherVisitor.status).toBe(409);
    expect(holderText).toBe(await otherVisitor.text());
    expect(JSON.parse(holderText)).toMatchObject({
      success: false,
      error: { code: "slot_unavailable" },
    });
    expect(await readCalls()).toHaveLength(1);
    expect(await suite.sentEmails()).toHaveLength(2);
  });

  it("refuses a second call for an address that holds one, without revealing that call", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const first = bookAssessmentCallResponseSchema.parse(
      await (await requestBooking({})).json(),
    );

    if (!first.success) {
      throw new Error("Expected the first start to be confirmed.");
    }

    // act
    const response = await requestBooking({ startsAt: SECOND_EVENING_START });

    // assert
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({
      success: false,
      error: { code: "booking_refused", message: expect.any(String) },
    });
    expect(text).not.toContain(first.booking.id);
    expect(text).not.toContain(FIRST_EVENING_START);
    expect(text).not.toContain("2026-10-19");
    expect(text).not.toMatch(/\d{1,2}:\d{2}/);
    expect(text).not.toContain("/join");
    expect(await readCalls()).toHaveLength(1);
    expect(await readCoachTimeReservations()).toEqual([
      expect.objectContaining({ appointmentId: first.booking.id }),
    ]);
  });

  it("gives a start to another visitor when an address refused for its upcoming call asks for it at the same moment", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await requestBooking({ startsAt: NEXT_DAY_EVENING_START });
    const otherVisitor = "maria@example.com";

    // act
    const [holder, other] = await Promise.all([
      requestBooking({}),
      requestBooking({ email: otherVisitor }),
    ]);

    // assert
    const holderBody = bookAssessmentCallResponseSchema.parse(
      await holder.json(),
    );
    const otherBody = bookAssessmentCallResponseSchema.parse(
      await other.json(),
    );

    if (holderBody.success || !otherBody.success) {
      throw new Error("Expected only the other visitor to be booked.");
    }

    const reservationsForTheStart = (await readCoachTimeReservations()).filter(
      (reservation) =>
        reservation.startsAt.toISOString() === FIRST_EVENING_START,
    );

    expect(holder.status).toBe(409);
    expect(["booking_refused", "slot_unavailable"]).toContain(
      holderBody.error.code,
    );
    expect(other.status).toBe(201);
    expect(reservationsForTheStart).toEqual([
      expect.objectContaining({ appointmentId: otherBody.booking.id }),
    ]);
    expect(await readCalls()).toEqual([
      expect.objectContaining({ id: otherBody.booking.id }),
      expect.objectContaining({ visitorEmail: VISITOR_EMAIL }),
    ]);
  });

  it("lets a visitor book again once their call is in the past", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    await requestBooking({});
    await suite.setServerClock(TUESDAY_MORNING);

    // act
    const response = await requestBooking({
      startsAt: NEXT_DAY_EVENING_START,
    });

    // assert
    expect(response.status).toBe(201);
    expect(await readCalls()).toHaveLength(2);
  });

  it("stores nothing when bot verification rejects the submission", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({}, "");

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
    expect(await readCalls()).toHaveLength(0);
    expect(await suite.sentEmails()).toHaveLength(0);
  });

  it("declines a time zone it cannot read", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({
      visitorTimeZone: "Mars/Olympus_Mons",
    });

    // assert
    const body = bookAssessmentCallResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "invalid_time_zone" },
    });
    expect(await readCalls()).toHaveLength(0);
  });

  it("keeps the evening start at seventeen hundred after the clocks change", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);

    // act
    const response = await requestBooking({
      startsAt: WINTER_TIME_EVENING_START,
    });

    // assert
    const [row] = await readCalls();

    expect(response.status).toBe(201);
    expect(row?.startsAt).toEqual(new Date(WINTER_TIME_EVENING_START));
  });

  it("tells a booked visitor their call link isn't ready before the coach saves one", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const booked = bookAssessmentCallResponseSchema.parse(
      await (await requestBooking({})).json(),
    );

    if (!booked.success) {
      throw new Error("Expected a confirmed booking.");
    }

    // act
    const response = await requestJoin(booked.booking.id);

    // assert
    const document = await response.text();

    expect(response.status).toBe(200);
    expect(document).toContain("Your call link isn&#x27;t ready yet");
  });

  it("sends a booked visitor to the meeting room once the coach saves one", async () => {
    // arrange
    await suite.setServerClock(MONDAY_MORNING);
    const booked = bookAssessmentCallResponseSchema.parse(
      await (await requestBooking({})).json(),
    );

    if (!booked.success) {
      throw new Error("Expected a confirmed booking.");
    }

    await saveAssessmentCallSettings({
      issuedAt: MONDAY_MORNING,
      meetingLink: MEETING_LINK,
    });

    // act
    const response = await requestJoin(booked.booking.id);

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(MEETING_LINK);
  });

  it.each([
    { bookingId: UNKNOWN_BOOKING_ID, scenario: "an unknown" },
    { bookingId: MALFORMED_BOOKING_ID, scenario: "a malformed" },
  ])(
    "answers $scenario join link with the standard not-found page",
    async ({ bookingId }) => {
      // arrange, act
      const response = await requestJoin(bookingId);

      // assert
      const document = await response.text();

      expect(response.status).toBe(404);
      expect(document).toContain("<title>Page Not Found | Evoa</title>");
      expect(document).toContain("Page not found");
      expect(document).toContain("Error 404");
      expect(document).not.toContain(bookingId);
    },
  );
});

async function requestSlots(): Promise<Response> {
  return suite.request(new Request(suite.url("/api/assessment-calls/slots")));
}

async function requestBookingPage(): Promise<Response> {
  return suite.request(new Request(suite.url("/book")));
}

async function requestJoin(bookingId: string): Promise<Response> {
  return suite.request(new Request(suite.url(`/book/${bookingId}/join`)));
}

async function saveAssessmentCallSettings(options: {
  issuedAt: Date;
  meetingLink: string;
}): Promise<void> {
  await suite.request(
    new Request(suite.url("/api/assessment-calls/settings"), {
      body: JSON.stringify({
        endHour: 20,
        meetingLink: options.meetingLink,
        startHour: 17,
        timeZone: "Europe/Bucharest",
        weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      }),
      headers: {
        authorization: `Bearer ${mintSessionToken({ ...COACH_SESSION, issuedAt: options.issuedAt })}`,
        "content-type": "application/json",
      },
      method: "PUT",
    }),
  );
}

async function requestBooking(
  overrides: Record<string, string>,
  turnstileToken: string = bookingToken,
): Promise<Response> {
  const body = new URLSearchParams({
    country: "RO",
    dateOfBirth: "1994-03-14",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    phoneCountry: "RO",
    phoneNumber: "0712 345 678",
    primaryGoal: "build_strength",
    email: VISITOR_EMAIL,
    startsAt: FIRST_EVENING_START,
    visitorTimeZone: VISITOR_TIME_ZONE,
    ...overrides,
  });

  if (turnstileToken) {
    body.set("cf-turnstile-response", turnstileToken);
  }

  return suite.request(
    new Request(suite.url("/api/assessment-calls"), {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    }),
  );
}

async function readCalls(): Promise<AssessmentCallRow[]> {
  return suite.postgres.queryRows<AssessmentCallRow>({
    sql: `
      select
        id,
        first_name as "firstName",
        last_name as "lastName",
        visitor_email as "visitorEmail",
        visitor_notes as "visitorNotes",
        date_of_birth::text as "dateOfBirth",
        gender,
        primary_goal as "primaryGoal",
        country,
        phone,
        starts_at as "startsAt",
        visitor_time_zone as "visitorTimeZone",
        coach_time_zone as "coachTimeZone",
        booked_at as "bookedAt"
      from app.assessment_calls
      order by starts_at
    `,
    values: [],
  });
}

async function readCoachTimeReservations(): Promise<CoachTimeReservationRow[]> {
  return suite.postgres.queryRows<CoachTimeReservationRow>({
    sql: `
      select
        starts_at as "startsAt",
        ends_at as "endsAt",
        appointment_kind as "appointmentKind",
        appointment_id as "appointmentId"
      from app.coach_time_reservations
      order by starts_at
    `,
    values: [],
  });
}

async function insertCallDirectly(columns: {
  gender: string;
  primary_goal: string;
}): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      insert into app.assessment_calls
        (first_name, last_name, visitor_email, date_of_birth, gender, primary_goal,
         country, starts_at, visitor_time_zone, coach_time_zone, booked_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    values: [
      "Ana",
      "Popescu",
      VISITOR_EMAIL,
      "1994-03-14",
      columns.gender,
      columns.primary_goal,
      "RO",
      FIRST_EVENING_START,
      VISITOR_TIME_ZONE,
      "Europe/Bucharest",
      MONDAY_MORNING.toISOString(),
    ],
  });
}

async function reserveCoachTimeDirectly(reservation: {
  startsAt: string;
  endsAt: string;
  appointmentKind: string;
}): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      insert into app.coach_time_reservations
        (starts_at, ends_at, appointment_kind, appointment_id)
      values ($1, $2, $3, gen_random_uuid())
    `,
    values: [
      reservation.startsAt,
      reservation.endsAt,
      reservation.appointmentKind,
    ],
  });
}

async function switchWaitlistModeOff(): Promise<void> {
  await suite.postgres.executeSql({
    sql: `
      update app.feature_flags
      set enabled = false, updated_at = now()
      where name = $1
    `,
    values: ["WAITLIST_MODE"],
  });
}
