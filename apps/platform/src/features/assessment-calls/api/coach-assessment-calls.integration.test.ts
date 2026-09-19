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

import { openSlotsResponseSchema } from "~/features/assessment-calls/contracts/assessment-calls";
import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { mintSessionToken } from "~integration-test-config/clerk-session";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

/**
 * Its own suite because the deployment names its bootstrap coach through the
 * environment, and the instance is handed that environment once, when
 * `suite.start()` spawns it. Mutating `process.env` here stays in this file:
 * vitest runs the default `forks` pool with `isolate: true`.
 */
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
    const page = await readPage(response);

    expect(response.status).toBe(200);
    expect(page).toContain("Upcoming calls");
    expect(page).toContain("No upcoming calls.");
    expect(page).toContain("View all calls");
    expect(page).toContain(`href="${suite.path("/coach/assessment-calls")}"`);
  });

  it("shows a booked call on the dashboard and on the calls page", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      fullName: "Ana Popescu",
      notes: "Wants to talk about her glutes",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));
    const calls = await readPage(await requestAsCoach(CALLS_PAGE));

    // assert — the server paints both surfaces in the coach's own zone.
    expect(dashboard).toContain("Ana Popescu");
    expect(dashboard).toContain("Mon, Oct 19");
    expect(dashboard).toContain("5:00 PM");
    expect(calls).toContain("Times in Europe/Bucharest, GMT+3");
    expect(calls).toContain("Ana Popescu");
    expect(calls).toContain("mailto:ana@example.com");
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
      fullName: "Later Visitor",
      startsAt: secondSlot,
    });
    await bookCall({
      email: "earlier@example.com",
      fullName: "Earlier Visitor",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));
    const calls = await readPage(await requestAsCoach(CALLS_PAGE));

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
      fullName: "Ana Popescu",
      startsAt: firstSlot,
    });
    await holdServerClock(TWO_DAYS_LATER);

    // act
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));
    const upcoming = await readPage(await requestAsCoach(CALLS_PAGE));
    const past = await readPage(
      await requestAsCoach(`${CALLS_PAGE}?status=past`),
    );

    // assert
    expect(dashboard).toContain("No upcoming calls.");
    expect(dashboard).not.toContain("Ana Popescu");
    expect(upcoming).toContain("No upcoming calls.");
    expect(past).toContain("Ana Popescu");
    expect(past).not.toContain("Join call");
  });

  it("counts the calls starting today in the greeting", async () => {
    // arrange
    await holdServerClock(MONDAY_MORNING);
    const [firstSlot] = await openSlots();
    await bookCall({
      email: "ana@example.com",
      fullName: "Ana Popescu",
      startsAt: firstSlot,
    });

    // act
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));

    // assert
    expect(dashboard).toContain("You have 1 assessment call today.");
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
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));

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
        fullName: `Visitor ${String(index + 1).padStart(2, "0")}`,
        startsAt,
      });
    }

    // act
    const secondPage = await readPage(
      await requestAsCoach(`${CALLS_PAGE}?status=all&page=2`),
    );
    const dashboard = await readPage(await requestAsCoach(DASHBOARD));

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

/**
 * Clerk rejects a session token issued outside the window the instance sees,
 * so a case that holds the clock has to mint for the instant it holds.
 */
async function holdServerClock(instant: Date): Promise<void> {
  heldInstant = instant;
  await suite.setServerClock(instant);
}

function sessionTokenFor(session: {
  sessionId: string;
  subjectId: string;
}): string {
  return mintSessionToken({ ...session, issuedAt: heldInstant ?? new Date() });
}

/**
 * The document the reader sees, without the hydration payload that repeats
 * every loader value, and without the comment markers React writes between
 * adjacent text nodes so that a sentence reads as one string.
 */
async function readPage(response: Response): Promise<string> {
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
  fullName: string;
  notes?: string;
  startsAt: string;
}): Promise<void> {
  const body = new URLSearchParams({
    "cf-turnstile-response": bookingToken,
    email: booking.email,
    fullName: booking.fullName,
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
      headers: { authorization: `Bearer ${sessionTokenFor(bootstrapCoach)}` },
    }),
  );
}

async function requestAsClient(target: string): Promise<Response> {
  return suite.request(
    new Request(suite.url(target), {
      headers: { authorization: `Bearer ${sessionTokenFor(client)}` },
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
