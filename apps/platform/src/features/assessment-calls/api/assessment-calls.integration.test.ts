import { ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  bookAssessmentCallResponseSchema,
  openSlotsResponseSchema,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

type AssessmentCallRow = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorNotes: string | null;
  startsAt: Date;
  visitorTimeZone: string;
  coachTimeZone: string;
  bookedAt: Date;
};

const COACH_EMAIL = "coach@evoa.fit";
const PRODUCT_EMAIL_REPLY_TO = "replies@evoa.fit";
const MEETING_LINK = "https://meet.example/eli-assessment-room";
const VISITOR_EMAIL = "ana@example.com";
const VISITOR_NAME = "Ana Popescu";
const VISITOR_TIME_ZONE = "Europe/London";

const suite = new ApiIntegrationTestSuite({
  environment: {
    ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL,
    ASSESSMENT_CALL_MEETING_LINK: MEETING_LINK,
    PRODUCT_EMAIL_REPLY_TO,
    WAITLIST_MODE: "false",
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
const UNKNOWN_BOOKING_ID = "00000000-0000-4000-8000-000000000000";
const MALFORMED_BOOKING_ID = "not-a-booking";

describe.sequential("assessment call booking integration", () => {
  beforeAll(async () => {
    await suite.start();
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
    expect(document).toContain("Start Your Plan");
    expect(document).toContain("Pick a date and time");
  });

  it("stores a booking in both time zones and notifies both sides", async () => {
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
      joinPath: `/book/${body.booking.id}/join`,
      startsAt: FIRST_EVENING_START,
      visitorTimeZone: VISITOR_TIME_ZONE,
    });
    expect(rows).toHaveLength(1);
    expect(row).toMatchObject({
      coachTimeZone: "Europe/Bucharest",
      id: body.booking.id,
      visitorEmail: VISITOR_EMAIL,
      visitorName: VISITOR_NAME,
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

    expect(visitorEmail?.text).toContain(VISITOR_NAME);
    expect(visitorEmail?.text).toContain("3:00 PM");
    expect(visitorEmail?.text).toContain(VISITOR_TIME_ZONE);
    expect(visitorEmail?.text).toContain(joinUrl);
    expect(visitorEmail?.text).toContain(
      "https://calendar.google.com/calendar/render",
    );
    expect(coachEmail?.text).toContain(VISITOR_NAME);
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

  it("sends a booked visitor to the meeting room", async () => {
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

async function requestBooking(
  overrides: Record<string, string>,
  turnstileToken: string = bookingToken,
): Promise<Response> {
  const body = new URLSearchParams({
    email: VISITOR_EMAIL,
    fullName: VISITOR_NAME,
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
        visitor_name as "visitorName",
        visitor_email as "visitorEmail",
        visitor_notes as "visitorNotes",
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
