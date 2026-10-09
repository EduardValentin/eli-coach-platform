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
import {
  CheckInsJourney,
  SIGNED_OUT,
} from "~integration-test-config/check-ins-journey";
import { ClientOnboardingJourney } from "~integration-test-config/client-onboarding-journey";
import {
  ANA,
  CALL_ENDED_INSTANT,
  CoachingSalesJourney,
  SECOND_PURCHASE,
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
  sessionId: "sess_checkins_ana",
  subjectId: "user_checkins_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_checkins_maria",
  subjectId: "user_checkins_maria",
};

const MARIA: Visitor = {
  email: "maria.checkins@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const VISITOR: Visitor = {
  email: "ioana.visitor@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const NOW = CALL_ENDED_INSTANT;
const WEDNESDAY_EVENING = "2026-10-21T14:00:00.000Z";
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const THURSDAY_SECOND_HOUR = "2026-10-22T15:00:00.000Z";
const THURSDAY_THIRD_HOUR = "2026-10-22T16:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";
const SATURDAY_EVENING = "2026-10-24T14:00:00.000Z";
const LAST_HOUR_IN_THE_HORIZON = "2026-11-20T17:00:00.000Z";
const NOTE = "Can we talk about my knees?";

describe.sequential("check-in requests integration", () => {
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

  describe("open times", () => {
    it("offers whole hours inside the coach's days and hours, from 24 hours ahead to 30 days ahead", async () => {
      // arrange
      await submittedAna();

      // act
      const times = await checkIns.openTimesOf(ANA_SESSION);

      // assert
      expect(times.slice(0, 4)).toEqual([
        THURSDAY_FIRST_HOUR,
        THURSDAY_SECOND_HOUR,
        THURSDAY_THIRD_HOUR,
        FRIDAY_FIRST_HOUR,
      ]);
      expect(times.at(-1)).toBe(LAST_HOUR_IN_THE_HORIZON);
      expect(times).not.toContain(WEDNESDAY_EVENING);
      expect(times).not.toContain(SATURDAY_EVENING);
    });

    it("leaves out the hour of a booked assessment call", async () => {
      // arrange
      await submittedAna();
      await sales.bookCallAt(VISITOR, THURSDAY_SECOND_HOUR);
      await rig.holdClock(NOW);

      // act
      const times = await checkIns.openTimesOf(ANA_SESSION);

      // assert
      expect(times).toContain(THURSDAY_FIRST_HOUR);
      expect(times).not.toContain(THURSDAY_SECOND_HOUR);
      expect(times).toContain(THURSDAY_THIRD_HOUR);
    });

    it("leaves out the hours of other clients' pending and approved check-ins", async () => {
      // arrange
      await submittedAna();
      await submittedMaria();
      const approved = await checkIns.requested(MARIA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });
      await checkIns.approved(approved);
      await checkIns.requested(MARIA_SESSION, {
        startsAt: THURSDAY_THIRD_HOUR,
      });

      // act
      const times = await checkIns.openTimesOf(ANA_SESSION);

      // assert
      expect(times).not.toContain(THURSDAY_FIRST_HOUR);
      expect(times).toContain(THURSDAY_SECOND_HOUR);
      expect(times).not.toContain(THURSDAY_THIRD_HOUR);
    });

    it("takes a pending request's hour off the booking page's slots", async () => {
      // arrange
      await submittedAna();
      await checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });

      // act
      const slots = await sales.openSlots();

      // assert
      expect(slots).not.toContain(THURSDAY_FIRST_HOUR);
      expect(slots).toContain(THURSDAY_SECOND_HOUR);
    });

    it("sends a visitor who is not signed in to sign in", async () => {
      // arrange
      await rig.holdClock(NOW);

      // act
      const response = await checkIns.openTimes(SIGNED_OUT);

      // assert
      expect(response.status).toBe(302);
    });
  });

  describe("asking for a check-in", () => {
    it("holds the hour and records the request with her note, in her zone and the coach's", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.request(ANA_SESSION, {
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
          initiatedBy: "client",
          proposedBy: "client",
          note: NOTE,
          requestedAt: NOW,
          answeredAt: null,
        },
      ]);
      expect(await checkIns.heldCheckInHours()).toEqual([
        {
          appointmentId: checkInId,
          startsAt: new Date(THURSDAY_FIRST_HOUR),
          endsAt: new Date(THURSDAY_SECOND_HOUR),
        },
      ]);
    });

    it("records a request without a note when she wrote none", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
        note: "   ",
      });

      // assert
      expect(response.status).toBe(201);
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ note }) => note),
      ).toEqual([null]);
    });

    it("emails the coach the request, keyed by the check-in, with her review link", async () => {
      // arrange
      await submittedAna();

      // act
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
        note: NOTE,
      });

      // assert
      const sent = await checkInEmailsOf(checkInId);
      expect(sent).toHaveLength(1);
      expect(sent[0]?.to).toBe(COACH_EMAIL);
      expect(sent[0]?.replyTo).toBe(ANA.email);
      expect(sent[0]?.idempotencyKey).toContain(
        `check-in:${checkInId}:requested`,
      );
      expect(sent[0]?.html).toContain(
        `href="${PUBLIC_ORIGIN}${suite.path("/coach/checkins")}"`,
      );
    });

    it("keeps the request when the provider refuses the coach's email", async () => {
      // arrange
      const clientId = await submittedAna();
      await suite.wireMock.stub(resendRejects("check-in:"));

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(201);
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    });

    it.each([
      { what: "within the next 24 hours", startsAt: WEDNESDAY_EVENING },
      { what: "on a day the coach does not work", startsAt: SATURDAY_EVENING },
      { what: "at half past the hour", startsAt: "2026-10-22T14:30:00.000Z" },
    ])(
      "refuses a time $what as taken and stores nothing",
      async ({ startsAt }) => {
        // arrange
        const clientId = await submittedAna();

        // act
        const response = await checkIns.request(ANA_SESSION, { startsAt });

        // assert
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: "time_taken" });
        expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
        expect(await checkIns.heldCheckInHours()).toEqual([]);
      },
    );

    it("refuses an hour a booked assessment call holds and stores nothing", async () => {
      // arrange
      const clientId = await submittedAna();
      await sales.bookCallAt(VISITOR, THURSDAY_FIRST_HOUR);
      await rig.holdClock(NOW);

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "time_taken" });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    });

    it("refuses a second request while her first one waits", async () => {
      // arrange
      const clientId = await submittedAna();
      const first = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "request_waiting" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ id }) => id),
      ).toEqual([first]);
      expect(
        (await checkIns.heldCheckInHours()).map(
          ({ appointmentId }) => appointmentId,
        ),
      ).toEqual([first]);
    });

    it("lets her ask again once her request was approved", async () => {
      // arrange
      const clientId = await submittedAna();
      const first = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });
      await checkIns.approved(first);

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(201);
      expect(await checkIns.checkInRowsOf(clientId)).toHaveLength(2);
    });

    it("leaves one request when she sends two at once", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const responses = await Promise.all([
        checkIns.request(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR }),
        checkIns.request(ANA_SESSION, { startsAt: FRIDAY_FIRST_HOUR }),
      ]);

      // assert
      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(await checkIns.checkInRowsOf(clientId)).toHaveLength(1);
      expect(await checkIns.heldCheckInHours()).toHaveLength(1);
    });

    it("leaves one request when two clients race for the same hour", async () => {
      // arrange
      await submittedAna();
      await submittedMaria();

      // act
      const responses = await Promise.all([
        checkIns.request(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR }),
        checkIns.request(MARIA_SESSION, { startsAt: THURSDAY_FIRST_HOUR }),
      ]);

      // assert
      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(await checkIns.allCheckInRows()).toHaveLength(1);
      expect(await checkIns.heldCheckInHours()).toHaveLength(1);
    });

    it.each([
      {
        what: "an unknown time zone",
        ask: { startsAt: THURSDAY_FIRST_HOUR, timeZone: "Mars/Olympus" },
        error: "invalid_time_zone",
      },
      {
        what: "a note over 500 characters",
        ask: { startsAt: THURSDAY_FIRST_HOUR, note: "a".repeat(501) },
        error: "note_too_long",
      },
      {
        what: "a time that is not an instant",
        ask: { startsAt: "next Thursday" },
        error: "invalid_request",
      },
    ])("refuses $what and stores nothing", async ({ ask, error }) => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.request(ANA_SESSION, ask);

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    });

    it("refuses a client whose coaching has ended", async () => {
      // arrange
      const clientId = await submittedAna();
      await endAnasCoaching();

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "ended" });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    });

    it("refuses a client who has not submitted her onboarding", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION);
      const clientId = await onboarding.clientIdOf(ANA_SESSION);
      await rig.holdClock(NOW);

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "ended" });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    });

    it("refuses the coach", async () => {
      // arrange
      await rig.holdClock(NOW);

      // act
      const response = await checkIns.request(COACH_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(403);
      expect(await checkIns.allCheckInRows()).toEqual([]);
    });
  });

  describe("withdrawing a request", () => {
    it("cancels her request, frees the hour and emails the coach", async () => {
      // arrange
      const clientId = await submittedAna();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.withdraw(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        status: "withdrawn",
        checkInId,
      });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([
        expect.objectContaining({
          id: checkInId,
          status: "cancelled",
          answeredAt: NOW,
        }),
      ]);
      expect(await checkIns.heldCheckInHours()).toEqual([]);
      expect(await checkIns.openTimesOf(ANA_SESSION)).toContain(
        THURSDAY_FIRST_HOUR,
      );
      const withdrawn = (await checkInEmailsOf(checkInId)).filter((email) =>
        email.idempotencyKey?.includes(`check-in:${checkInId}:withdrawn`),
      );
      expect(withdrawn.map(({ to }) => to)).toEqual([COACH_EMAIL]);
    });

    it("refuses to withdraw a request twice", async () => {
      // arrange
      await submittedAna();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });
      await checkIns.withdraw(ANA_SESSION, checkInId);

      // act
      const response = await checkIns.withdraw(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
    });

    it("refuses to withdraw a request the coach already approved and keeps the hour", async () => {
      // arrange
      await submittedAna();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });
      await checkIns.approved(checkInId);

      // act
      const response = await checkIns.withdraw(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(await checkIns.heldCheckInHours()).toHaveLength(1);
    });

    it("refuses to withdraw a request whose time has come", async () => {
      // arrange
      await submittedAna();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });
      await rig.holdClock(new Date(THURSDAY_FIRST_HOUR));

      // act
      const response = await checkIns.withdraw(ANA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
    });

    it("answers not found to another client's request and leaves it waiting", async () => {
      // arrange
      const anaId = await submittedAna();
      await submittedMaria();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.withdraw(MARIA_SESSION, checkInId);

      // assert
      expect(response.status).toBe(404);
      expect(
        (await checkIns.checkInRowsOf(anaId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    });

    it("answers not found to a check-in that does not exist", async () => {
      // arrange
      await submittedAna();

      // act
      const response = await checkIns.withdraw(
        ANA_SESSION,
        "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
      );

      // assert
      expect(response.status).toBe(404);
    });
  });
});

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function submittedMaria(): Promise<string> {
  await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);
  await rig.holdClock(NOW);
  await onboarding.submit(MARIA_SESSION);

  return onboarding.clientIdOf(MARIA_SESSION);
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_checkins_coaching_ended",
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

async function checkInEmailsOf(checkInId: string) {
  const emails = await suite.sentEmails();

  return emails.filter((email) =>
    email.idempotencyKey?.includes(`check-in:${checkInId}:`),
  );
}
