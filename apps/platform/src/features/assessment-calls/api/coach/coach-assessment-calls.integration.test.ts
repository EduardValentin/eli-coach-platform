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
  COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
  openSlotsResponseSchema,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();

const bootstrapCoach = {
  sessionId: "sess_6gen193coachsession",
  subjectId: "user_6gen193coachsubject",
};
const client = {
  sessionId: "sess_7gen193clientsession",
  subjectId: "user_7gen193clientsubject",
};

const bookingToken = turnstileTokenForAction(
  ASSESSMENT_CALL_BOOKING_TURNSTILE_ACTION,
);

const DASHBOARD = "/coach/";
const CALLS_PAGE = "/coach/assessment-calls/";

let heldInstant: Date | null = null;

const MONDAY_MORNING = new Date("2026-10-19T08:00:00.000Z");
const MONDAY_NIGHT = new Date("2026-10-19T20:00:00.000Z");
const TWO_DAYS_LATER = new Date("2026-10-21T08:00:00.000Z");
const VISITOR_TIME_ZONE = "Europe/London";

describe.sequential("coach assessment calls integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = bootstrapCoach.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await switchWaitlistModeOff();
    await provisionCoach();
  });

  afterEach(async () => {
    heldInstant = null;
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  it("opens the dashboard on an empty widget that still offers the whole list", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);

    // act
    const response = await requestAsCoach(DASHBOARD);

    // assert
    const page = await visibleDocument(response);

    expect(response.status).toBe(200);
    expect(page).toContain("Upcoming calls");
    expect(page).toContain("No upcoming calls.");
    expect(page).toContain("View all calls");
    expect(page).toContain(`href="${suite.path("/coach/assessment-calls")}"`);
  });

  it("paints a booked call on both coach surfaces in the coach's own zone", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      notes: "Wants to talk about her glutes",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));
    const calls = await visibleDocument(await requestAsCoach(CALLS_PAGE));

    // assert
    expect(dashboard).toContain("Ana Popescu");
    expect(dashboard).toContain("Mon, Oct 19");
    expect(dashboard).toContain("5:00 PM");
    expect(calls).toContain("Ana Popescu");
    expect(calls).toContain("mailto:ana@example.com");
    expect(calls).toContain("tel:+40712345678");
    expect(calls).toContain("32 (14 Mar 1994)");
    expect(calls).toContain("Female");
    expect(calls).toContain("Build strength");
    expect(calls).toContain("Romania");
    expect(calls).toContain("Wants to talk about her glutes");
    expect(calls).toContain("Mon, Oct 19");
    expect(calls).toContain("5:00 PM");
  });

  it("puts the soonest call first however the bookings arrived", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot, secondSlot] = await openSlots();
    await bookCall({
      email: "later@example.com",
      firstName: "Later",
      lastName: "Visitor",
      startsAt: secondSlot,
    });
    await bookCall({
      email: "earlier@example.com",
      firstName: "Earlier",
      lastName: "Visitor",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));
    const calls = await visibleDocument(await requestAsCoach(CALLS_PAGE));

    // assert
    expect(dashboard.indexOf("Earlier Visitor")).toBeLessThan(
      dashboard.indexOf("Later Visitor"),
    );
    expect(calls.indexOf("Earlier Visitor")).toBeLessThan(
      calls.indexOf("Later Visitor"),
    );
  });

  it("moves a call that has ended out of the widget and under Past", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      startsAt: firstSlot,
    });
    await holdServerClock(TWO_DAYS_LATER);

    // act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));
    const upcoming = await visibleDocument(await requestAsCoach(CALLS_PAGE));
    const past = await visibleDocument(
      await requestAsCoach(`${CALLS_PAGE}?status=past`),
    );

    // assert
    expect(dashboard).toContain("No upcoming calls.");
    expect(dashboard).not.toContain("Ana Popescu");
    expect(upcoming).toContain("No upcoming calls.");
    expect(past).toContain("Ana Popescu");
    expect(past).not.toContain("Join call");
  });

  it("counts the calls she has left today in the greeting", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));

    // assert
    expect(dashboard).toContain("You have 1 assessment call today.");
  });

  it("stops counting a call once it has ended, on the day it ran", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Popescu",
      startsAt: firstSlot,
    });
    await holdServerClock(MONDAY_NIGHT);

    // act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));

    // assert
    expect(dashboard).toContain("You have 0 assessment calls today.");
  });

  it("answers both coach pages with 503 when the calls cannot be read", async () => {
    // arrange
    await makeAssessmentCallsUnreadable();

    // act
    const dashboard = await requestAsCoach(DASHBOARD);
    const calls = await requestAsCoach(CALLS_PAGE);

    // assert
    expect(dashboard.status).toBe(503);
    expect(calls.status).toBe(503);
    expect(await visibleDocument(dashboard)).toContain(
      COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
    );
    expect(await visibleDocument(calls)).toContain(
      COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
    );
  });

  it("keeps a CLIENT out of both coach pages", async () => {
    // arrange
    await provisionClient();

    // act
    const dashboard = await requestAsClient(DASHBOARD);
    const calls = await requestAsClient(CALLS_PAGE);

    // assert
    expect(dashboard.status).toBe(403);
    expect(calls.status).toBe(403);
  });

  it("sends an anonymous visitor to sign in from both coach pages", async () => {
    // arrange, act
    const dashboard = await suite.request(new Request(suite.url(DASHBOARD)));
    const calls = await suite.request(new Request(suite.url(CALLS_PAGE)));

    // assert
    expect(dashboard.status).toBe(302);
    expect(dashboard.headers.get("location")).toContain(
      "/sign-in?redirect_url=",
    );
    expect(calls.status).toBe(302);
    expect(calls.headers.get("location")).toContain(
      encodeURIComponent(suite.path("/coach/assessment-calls/")),
    );
  });

  it("offers the assessment calls page from the coach sidebar", async () => {
    // arrange, act
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));

    // assert
    expect(dashboard).toContain("Coach portal navigation");
    expect(dashboard).toContain("Assessment calls");
    expect(dashboard).toContain(
      `href="${suite.path("/coach/assessment-calls")}"`,
    );
  });

  it("pages the calls page and keeps the dashboard to the next three", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const slots = (await openSlots()).slice(0, 12);

    for (const [index, startsAt] of slots.entries()) {
      await bookCall({
        email: `visitor${index + 1}@example.com`,
        firstName: "Visitor",
        lastName: String(index + 1).padStart(2, "0"),
        startsAt,
      });
    }

    // act
    const secondPage = await visibleDocument(
      await requestAsCoach(`${CALLS_PAGE}?status=all&page=2`),
    );
    const dashboard = await visibleDocument(await requestAsCoach(DASHBOARD));

    // assert
    expect(secondPage).toContain("Visitor 11");
    expect(secondPage).toContain("Visitor 12");
    expect(secondPage).not.toContain("Visitor 01");
    expect(secondPage).toContain("Showing 11–12 of 12");
    expect(dashboard).toContain("Visitor 01");
    expect(dashboard).toContain("Visitor 03");
    expect(dashboard).not.toContain("Visitor 04");
  });
});

async function holdServerClock(instant: Date): Promise<void> {
  heldInstant = instant;
  await suite.setServerClock(instant);
}

function sessionTokenForHeldClock(session: {
  sessionId: string;
  subjectId: string;
}): string {
  return mintSessionToken({ ...session, issuedAt: heldInstant ?? new Date() });
}

async function visibleDocument(response: Response): Promise<string> {
  const [rendered] = (await response.text()).split("<script");

  return rendered.replaceAll("<!-- -->", "");
}

async function openSlots(): Promise<string[]> {
  const response = await suite.request(
    new Request(suite.url("/api/assessment-calls/slots")),
  );

  return openSlotsResponseSchema.parse(await response.json()).slots;
}

async function bookCall(booking: {
  email: string;
  firstName: string;
  lastName: string;
  notes?: string;
  startsAt: string;
}): Promise<void> {
  const body = new URLSearchParams({
    "cf-turnstile-response": bookingToken,
    country: "RO",
    dateOfBirth: "1994-03-14",
    email: booking.email,
    firstName: booking.firstName,
    gender: "female",
    lastName: booking.lastName,
    phoneCountry: "RO",
    phoneNumber: "0712 345 678",
    primaryGoal: "build_strength",
    startsAt: booking.startsAt,
    visitorTimeZone: VISITOR_TIME_ZONE,
  });

  if (booking.notes) {
    body.set("notes", booking.notes);
  }

  const response = await suite.request(
    new Request(suite.url("/api/assessment-calls"), {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    }),
  );

  expect(response.status).toBe(201);
}

async function requestAsCoach(target: string): Promise<Response> {
  return suite.request(
    new Request(suite.url(target), {
      headers: {
        authorization: `Bearer ${sessionTokenForHeldClock(bootstrapCoach)}`,
      },
    }),
  );
}

async function requestAsClient(target: string): Promise<Response> {
  return suite.request(
    new Request(suite.url(target), {
      headers: { authorization: `Bearer ${sessionTokenForHeldClock(client)}` },
    }),
  );
}

async function provisionCoach(): Promise<void> {
  await requestAsCoach("/api/account");
}

async function provisionClient(): Promise<void> {
  await suite.postgres.executeSql({
    sql: "insert into app.accounts (auth_subject_id, role) values ($1, $2)",
    values: [client.subjectId, "CLIENT"],
  });
}

// The schema is dropped and remigrated between cases, so the rename lives
// only as long as the case that asks for it.
async function makeAssessmentCallsUnreadable(): Promise<void> {
  await suite.postgres.executeSql({
    sql: "alter table app.assessment_calls rename to assessment_calls_unreadable",
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
