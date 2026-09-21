import { ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const COACH_SESSION = {
  sessionId: "sess_waitlistcoachsession",
  subjectId: "user_waitlistcoachsubject",
};

const suite = new ApiIntegrationTestSuite({
  environment: { BOOTSTRAP_COACH_AUTH_SUBJECT_ID: COACH_SESSION.subjectId },
});
const bookingToken = turnstileTokenForAction(
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
);
const SAVED_MEETING_LINK = "https://meet.example/eli-assessment-room";
const BOOKED_START = "2026-10-19T14:00:00.000Z";

describe.sequential("assessment calls during the waitlist", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("does not serve the booking page", async () => {
    // arrange, act
    const response = await suite.request(new Request(suite.url("/book")));

    // assert
    expect(response.status).toBe(404);
  });

  it("serves the booking page once waitlist mode is switched off, without a restart", async () => {
    // arrange, act
    const waitlistModeResponse = await suite.request(
      new Request(suite.url("/book")),
    );

    // arrange
    await switchWaitlistModeOff();

    // act
    const bookingModeResponse = await suite.request(
      new Request(suite.url("/book")),
    );

    // assert
    expect(waitlistModeResponse.status).toBe(404);
    expect(bookingModeResponse.status).toBe(200);
  });

  it("does not answer the open slots", async () => {
    // arrange, act
    const response = await suite.request(
      new Request(suite.url("/api/assessment-calls/slots")),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("does not take a booking", async () => {
    // arrange
    const body = new URLSearchParams({
      "cf-turnstile-response": bookingToken,
      country: "RO",
      dateOfBirth: "1994-03-14",
      email: "ana@example.com",
      firstName: "Ana",
      gender: "female",
      lastName: "Popescu",
      primaryGoal: "build_strength",
      startsAt: BOOKED_START,
      visitorTimeZone: "Europe/London",
    });

    // act
    const response = await suite.request(
      new Request(suite.url("/api/assessment-calls"), {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      }),
    );

    // assert
    const storedCalls = await suite.postgres.countRows({
      tableName: "app.assessment_calls",
      values: [],
      whereClause: "true",
    });

    expect(response.status).toBe(404);
    expect(storedCalls).toBe(0);
  });

  it("still sends a visitor whose call was booked before the waitlist to the meeting room", async () => {
    // arrange
    const bookingId = await seedAssessmentCall();
    await saveAssessmentCallSettings({ meetingLink: SAVED_MEETING_LINK });

    // act
    const response = await suite.request(
      new Request(suite.url(`/book/${bookingId}/join`)),
    );

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(SAVED_MEETING_LINK);
  });
});

async function saveAssessmentCallSettings(options: {
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
        authorization: `Bearer ${mintSessionToken(COACH_SESSION)}`,
        "content-type": "application/json",
      },
      method: "PUT",
    }),
  );
}

async function seedAssessmentCall(): Promise<string> {
  const [row] = await suite.postgres.queryRows<{ id: string }>({
    sql: `
      insert into app.assessment_calls (
        first_name,
        last_name,
        visitor_email,
        visitor_notes,
        date_of_birth,
        gender,
        primary_goal,
        country,
        phone,
        starts_at,
        visitor_time_zone,
        coach_time_zone,
        booked_at
      )
      values ($1, $2, $3, null, $4, $5, $6, $7, null, $8, $9, $10, $11)
      returning id
    `,
    values: [
      "Ana",
      "Popescu",
      "ana@example.com",
      "1994-03-14",
      "female",
      "build_strength",
      "RO",
      BOOKED_START,
      "Europe/London",
      "Europe/Bucharest",
      "2026-10-19T08:00:00.000Z",
    ],
  });

  if (!row) {
    throw new Error("Expected the seeded assessment call to exist.");
  }

  return row.id;
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
