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
  sessionId: "sess_client_answers_ana",
  subjectId: "user_client_answers_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_client_answers_maria",
  subjectId: "user_client_answers_maria",
};

const MARIA: Visitor = {
  email: "maria.answers@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const SCHEDULED_AT = CALL_ENDED_INSTANT;
const ANSWERED_AT = new Date("2026-10-21T09:30:00.000Z");
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const HER_ZONE_NOW = "America/New_York";

type Answer = "approve" | "decline";

const ANSWERS: Record<
  Answer,
  (
    checkInId: string,
    session: AccountSession,
    answer?: { timeZone?: string },
  ) => Promise<Response>
> = {
  approve: (checkInId, session, answer) =>
    checkIns.approve(checkInId, session, answer),
  decline: (checkInId, session, answer) =>
    checkIns.decline(checkInId, session, answer),
};

describe.sequential("client check-in answers integration", () => {
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

  it("approves the coach's request in the zone she answered from, keeps the hour and emails the coach her join link and invite", async () => {
    // arrange
    const { clientId, checkInId } = await coachScheduledAnaForThursday();
    await rig.holdClock(ANSWERED_AT);

    // act
    const response = await checkIns.approve(checkInId, ANA_SESSION, {
      timeZone: HER_ZONE_NOW,
    });

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved", checkInId });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      expect.objectContaining({
        id: checkInId,
        status: "approved",
        clientTimeZone: HER_ZONE_NOW,
        answeredAt: ANSWERED_AT,
      }),
    ]);
    expect(
      (await checkIns.heldCheckInHours()).map((hour) => hour.checkInId),
    ).toEqual([checkInId]);
    const [approved, ...others] = await emailsFor(checkInId, "approved");
    expect(others).toEqual([]);
    expect(approved?.to).toBe(COACH_EMAIL);
    expect(approved?.replyTo).toBe(ANA.email);
    expect(approved?.subject).toBe("Ana Popescu approved the check-in");
    expect(approved?.text).toContain("Europe/Bucharest");
    expect(approved?.html).toContain(
      `href="${PUBLIC_ORIGIN}${suite.path(`/coach/checkins/${checkInId}/join`)}"`,
    );
    expect(approved?.html).toContain(
      'href="https://calendar.google.com/calendar/render?',
    );
    const [invite, ...otherAttachments] = approved?.attachments ?? [];
    expect(otherAttachments).toEqual([]);
    expect(invite?.filename).toBe("invite.ics");
    expect(invite?.contentText).toContain("DTSTART:20261022T140000Z");
  });

  it("declines the coach's request in the zone she answered from, frees the hour and emails the coach", async () => {
    // arrange
    const { clientId, checkInId } = await coachScheduledAnaForThursday();
    await rig.holdClock(ANSWERED_AT);

    // act
    const response = await checkIns.decline(checkInId, ANA_SESSION, {
      timeZone: HER_ZONE_NOW,
    });

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "declined", checkInId });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      expect.objectContaining({
        id: checkInId,
        status: "cancelled",
        clientTimeZone: HER_ZONE_NOW,
        answeredAt: ANSWERED_AT,
      }),
    ]);
    expect(await checkIns.heldCheckInHours()).toEqual([]);
    expect(await checkIns.openTimesOf(ANA_SESSION)).toContain(
      THURSDAY_FIRST_HOUR,
    );
    const [declined, ...others] = await emailsFor(checkInId, "declined");
    expect(others).toEqual([]);
    expect(declined?.to).toBe(COACH_EMAIL);
    expect(declined?.subject).toBe("Ana Popescu declined the check-in");
    expect(declined?.text).toContain("That hour is free again.");
    expect(declined?.attachments).toEqual([]);
  });

  it("lets the coach cancel her waiting request, frees the hour and emails the client in her zone", async () => {
    // arrange
    const { clientId, checkInId } = await coachScheduledAnaForThursday();
    await rig.holdClock(ANSWERED_AT);

    // act
    const response = await checkIns.withdraw(COACH_SESSION, checkInId);

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "withdrawn", checkInId });
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([
      expect.objectContaining({
        id: checkInId,
        status: "cancelled",
        clientTimeZone: "Europe/London",
        answeredAt: ANSWERED_AT,
      }),
    ]);
    expect(await checkIns.heldCheckInHours()).toEqual([]);
    const [cancelled, ...others] = await emailsFor(checkInId, "withdrawn");
    expect(others).toEqual([]);
    expect(cancelled?.to).toBe(ANA.email);
    expect(cancelled?.subject).toBe("Eli cancelled the check-in request");
    expect(cancelled?.text).toContain("Europe/London");
  });

  it.each<Answer>(["approve", "decline"])(
    "refuses the client's %s of her own request",
    async (answer) => {
      // arrange
      const clientId = await submittedAna();
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // act
      const response = await ANSWERS[answer](checkInId, ANA_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses the coach's %s of her own request",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await coachScheduledAnaForThursday();

      // act
      const response = await ANSWERS[answer](checkInId, COACH_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    },
  );

  it("refuses the client's cancel of the coach's request and keeps the hour", async () => {
    // arrange
    const { clientId, checkInId } = await coachScheduledAnaForThursday();

    // act
    const response = await checkIns.withdraw(ANA_SESSION, checkInId);

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "not_pending" });
    expect(
      (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
    ).toEqual(["pending"]);
    expect(await checkIns.heldCheckInHours()).toHaveLength(1);
  });

  it.each<Answer>(["approve", "decline"])(
    "answers not found when another client tries to %s the request",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await coachScheduledAnaForThursday();
      await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);
      await rig.holdClock(SCHEDULED_AT);
      await onboarding.submit(MARIA_SESSION);

      // act
      const response = await ANSWERS[answer](checkInId, MARIA_SESSION);

      // assert
      expect(response.status).toBe(404);
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses to %s from a zone that names no place",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await coachScheduledAnaForThursday();

      // act
      const response = await ANSWERS[answer](checkInId, ANA_SESSION, {
        timeZone: "Mars/Olympus",
      });

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "invalid_time_zone" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses to %s once the request's time came unanswered, and emails nobody about it",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await coachScheduledAnaForThursday();
      await rig.holdClock(new Date(THURSDAY_FIRST_HOUR));

      // act
      const response = await ANSWERS[answer](checkInId, ANA_SESSION, {
        timeZone: HER_ZONE_NOW,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(await checkIns.checkInRowsOf(clientId)).toEqual([
        expect.objectContaining({
          status: "pending",
          clientTimeZone: "Europe/London",
        }),
      ]);
      expect(
        (await emailsFor(checkInId)).map(({ idempotencyKey }) =>
          idempotencyKey?.includes(`check-in:${checkInId}:requested`),
        ),
      ).toEqual([true]);
    },
  );

  it.each<Answer>(["approve", "decline"])(
    "refuses to %s once her coaching has ended",
    async (answer) => {
      // arrange
      const { clientId, checkInId } = await coachScheduledAnaForThursday();
      await endAnasCoaching();

      // act
      const response = await ANSWERS[answer](checkInId, ANA_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "ended" });
      expect(
        (await checkIns.checkInRowsOf(clientId)).map(({ status }) => status),
      ).toEqual(["pending"]);
    },
  );

  it("leaves one answer when her approval races her decline", async () => {
    // arrange
    const { clientId, checkInId } = await coachScheduledAnaForThursday();

    // act
    const responses = await Promise.all([
      checkIns.approve(checkInId, ANA_SESSION, { timeZone: HER_ZONE_NOW }),
      checkIns.decline(checkInId, ANA_SESSION, { timeZone: HER_ZONE_NOW }),
    ]);

    // assert
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const [row] = await checkIns.checkInRowsOf(clientId);
    expect(row?.status).toMatch(/^(approved|cancelled)$/);
    expect(await checkIns.heldCheckInHours()).toHaveLength(
      row?.status === "approved" ? 1 : 0,
    );
    expect(
      (await emailsFor(checkInId)).filter(
        ({ idempotencyKey }) => !idempotencyKey?.includes(":requested"),
      ),
    ).toHaveLength(1);
  });
});

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(SCHEDULED_AT);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function coachScheduledAnaForThursday(): Promise<{
  clientId: string;
  checkInId: string;
}> {
  const clientId = await submittedAna();
  const checkInId = await checkIns.scheduled({
    clientId,
    startsAt: THURSDAY_FIRST_HOUR,
  });

  return { clientId, checkInId };
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_client_answers_coaching_ended",
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

async function emailsFor(checkInId: string, event = "") {
  const emails = await suite.sentEmails();

  return emails.filter((email) =>
    email.idempotencyKey?.includes(`check-in:${checkInId}:${event}`),
  );
}
