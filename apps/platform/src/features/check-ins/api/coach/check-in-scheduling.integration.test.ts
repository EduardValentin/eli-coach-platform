import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { ApiIntegrationTestSuite } from "~integration-test-config/api-integration-test-suite";
import { CheckInsJourney } from "~integration-test-config/check-ins-journey";
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  stripeSubscriptionObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";
import { resendRejects } from "~integration-test-config/wire-mock/expectations/resend-emails";
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const COACH_EMAIL = "eli@evoa.fit";
const PUBLIC_ORIGIN = "https://localhost:3000";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_checkin_scheduling_ana",
  subjectId: "user_checkin_scheduling_ana",
};

const VISITOR: Visitor = {
  email: "ioana.scheduling@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const NOW = CALL_ENDED_INSTANT;
const WEDNESDAY_EVENING = "2026-10-21T14:00:00.000Z";
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const THURSDAY_SECOND_HOUR = "2026-10-22T15:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";
const MONDAY_FIRST_HOUR = "2026-10-26T15:00:00.000Z";
const UNKNOWN_CLIENT_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const NOTE = "Let's review your first month.";

describe.sequential("check-in scheduling integration", () => {
  beforeAll(async () => {
    process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID = COACH_SESSION.subjectId;
    await suite.start();
  });

  beforeEach(async () => {
    await rig.switchWaitlistModeOff();
    await rig.provisionCoach();
  });

  afterEach(async () => {
    rig.releaseClock();
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
    delete process.env.BOOTSTRAP_COACH_AUTH_SUBJECT_ID;
  });

  it("holds the hour and records the coach's request with her note, in the zone the client booked from", async () => {
    // arrange
    const clientId = await submittedAna();

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
      note: `  ${NOTE}  `,
    });

    // assert
    expect(response.status).toBe(201);
    const { checkInId } = (await response.json()) as { checkInId: string };
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      {
        id: checkInId,
        clientId,
        startsAt: new Date(THURSDAY_FIRST_HOUR),
        clientTimeZone: "Europe/London",
        coachTimeZone: "Europe/Bucharest",
        kind: "ad_hoc",
        status: "pending",
        initiatedBy: "coach",
        proposedBy: "coach",
        note: NOTE,
        requestedAt: NOW,
        answeredAt: null,
      },
    ]);
    expect(await checkIns.heldCheckInHours()).toEqual([
      {
        checkInId,
        startsAt: new Date(THURSDAY_FIRST_HOUR),
        endsAt: new Date(THURSDAY_SECOND_HOUR),
      },
    ]);
  });

  it("records a request without a note when the coach wrote none", async () => {
    // arrange
    const clientId = await submittedAna();

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(201);
    expect(
      (await checkIns.checkInRowsOf(clientId)).map(({ note }) => note),
    ).toEqual([null]);
  });

  it("takes the hour off the client's picker and the booking page's slots", async () => {
    // arrange
    const clientId = await submittedAna();
    await checkIns.scheduled({ clientId, startsAt: THURSDAY_FIRST_HOUR });

    // act
    const times = await checkIns.openTimesOf(ANA_SESSION);
    const slots = await sales.openSlots();

    // assert
    expect(times).not.toContain(THURSDAY_FIRST_HOUR);
    expect(times).toContain(THURSDAY_SECOND_HOUR);
    expect(slots).not.toContain(THURSDAY_FIRST_HOUR);
  });

  it("emails the client the request in her zone, naming it, with the coach's note and her Check-ins page", async () => {
    // arrange
    const clientId = await submittedAna();

    // act
    const checkInId = await checkIns.scheduled({
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
      note: NOTE,
    });

    // assert
    const [sent, ...others] = await checkInEmailsOf(checkInId);
    expect(others).toEqual([]);
    expect(sent?.to).toBe(ANA.email);
    expect(sent?.subject).toBe("Eli scheduled a check-in with you");
    expect(sent?.idempotencyKey).toContain(`check-in:${checkInId}:requested`);
    expect(sent?.text).toContain("Europe/London");
    expect(sent?.text).not.toContain("Europe/Bucharest");
    expect(sent?.text).toContain(`NOTE: ${NOTE}`);
    expect(sent?.html).toContain(
      `href="${PUBLIC_ORIGIN}${suite.path("/client/checkins")}"`,
    );
  });

  it("keeps the request when the provider refuses the client's email", async () => {
    // arrange
    const clientId = await submittedAna();
    await suite.wireMock.stub(resendRejects("check-in:"));

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(201);
    expect(
      (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
    ).toEqual(["pending"]);
  });

  it("accepts a second request from the coach for the same client", async () => {
    // arrange
    const clientId = await submittedAna();
    await checkIns.scheduled({ clientId, startsAt: THURSDAY_FIRST_HOUR });

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: FRIDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(201);
    expect(await checkIns.checkInRowsOf(clientId)).toHaveLength(2);
    expect(await checkIns.heldCheckInHours()).toHaveLength(2);
  });

  it("still limits the client to one waiting request of her own beside the coach's", async () => {
    // arrange
    const clientId = await submittedAna();
    await checkIns.scheduled({ clientId, startsAt: THURSDAY_FIRST_HOUR });
    await checkIns.requested(ANA_SESSION, { startsAt: FRIDAY_FIRST_HOUR });

    // act
    const response = await checkIns.request(ANA_SESSION, {
      startsAt: MONDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "request_waiting" });
    expect(await checkIns.checkInRowsOf(clientId)).toHaveLength(2);
  });

  it.each([
    { what: "within the next 24 hours", startsAt: WEDNESDAY_EVENING },
    { what: "at half past the hour", startsAt: "2026-10-22T14:30:00.000Z" },
  ])(
    "refuses a time $what as taken and stores nothing",
    async ({ startsAt }) => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.schedule(COACH_SESSION, {
        clientId,
        startsAt,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "time_taken" });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    },
  );

  it("refuses an hour a booked assessment call holds and stores nothing", async () => {
    // arrange
    const clientId = await submittedAna();
    await sales.bookCallAt(VISITOR, THURSDAY_FIRST_HOUR);
    await rig.holdClock(NOW);

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "time_taken" });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
  });

  it("refuses a client whose coaching runs but who has not sent her onboarding", async () => {
    // arrange
    await onboarding.admit(ANA, ANA_SESSION);
    const clientId = await onboarding.clientIdOf(ANA_SESSION);
    await rig.holdClock(NOW);

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "client_cannot_answer" });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    expect(await checkInEmails()).toEqual([]);
  });

  it("refuses a client whose coaching has ended", async () => {
    // arrange
    const clientId = await submittedAna();
    await endAnasCoaching();

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "client_cannot_answer" });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
  });

  it("answers not found for a client the coach does not have", async () => {
    // arrange
    await rig.holdClock(NOW);

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId: UNKNOWN_CLIENT_ID,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(404);
    expect(await checkIns.allCheckInRows()).toEqual([]);
  });

  it.each([
    {
      what: "a note over 500 characters",
      note: "a".repeat(501),
      startsAt: THURSDAY_FIRST_HOUR,
      error: "note_too_long",
    },
    {
      what: "a time that is not an instant",
      note: null,
      startsAt: "next Thursday",
      error: "invalid_request",
    },
  ])("refuses $what and stores nothing", async ({ note, startsAt, error }) => {
    // arrange
    const clientId = await submittedAna();

    // act
    const response = await checkIns.schedule(COACH_SESSION, {
      clientId,
      startsAt,
      note,
    });

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
  });

  it("refuses a client who tries to schedule", async () => {
    // arrange
    const clientId = await submittedAna();

    // act
    const response = await checkIns.schedule(ANA_SESSION, {
      clientId,
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // assert
    expect(response.status).toBe(403);
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
  });
});

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_checkin_scheduling_coaching_ended",
    type: "customer.subscription.deleted",
    object: stripeSubscriptionObject({
      status: "canceled",
      ended_at: toUnixSeconds(rig.now()),
    }),
  });

  if (delivered.status !== 200) {
    throw new Error(`Ending her coaching answered ${delivered.status}.`);
  }
}

async function checkInEmails() {
  return (await suite.sentEmails()).filter((email) =>
    email.idempotencyKey?.includes("check-in:"),
  );
}

async function checkInEmailsOf(checkInId: string) {
  return (await checkInEmails()).filter((email) =>
    email.idempotencyKey?.includes(`check-in:${checkInId}:`),
  );
}
