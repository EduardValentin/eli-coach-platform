import { ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const bookingToken = turnstileTokenForAction(
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
);
const PLACEHOLDER_MEETING_LINK = "https://meet.google.com/mock-eli-assessment";
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
      email: "ana@example.com",
      fullName: "Ana Popescu",
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

    // act
    const response = await suite.request(
      new Request(suite.url(`/book/${bookingId}/join`)),
    );

    // assert
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(PLACEHOLDER_MEETING_LINK);
  });
});

async function seedAssessmentCall(): Promise<string> {
  const [row] = await suite.postgres.queryRows<{ id: string }>({
    sql: `
      insert into app.assessment_calls (
        visitor_name,
        visitor_email,
        visitor_notes,
        starts_at,
        visitor_time_zone,
        coach_time_zone,
        booked_at
      )
      values ($1, $2, null, $3, $4, $5, $6)
      returning id
    `,
    values: [
      "Ana Popescu",
      "ana@example.com",
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
