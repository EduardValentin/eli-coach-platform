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
  sessionId: "sess_check_in_new_times_ana",
  subjectId: "user_check_in_new_times_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_check_in_new_times_maria",
  subjectId: "user_check_in_new_times_maria",
};

const MARIA: Visitor = {
  email: "maria.new-times@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const VISITOR: Visitor = {
  email: "ioana.new-times@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const NOW = CALL_ENDED_INSTANT;
const PROPOSED_AT = new Date("2026-10-21T09:30:00.000Z");
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";
const FRIDAY_SECOND_HOUR = "2026-10-23T15:00:00.000Z";
const MONDAY_FIRST_HOUR = "2026-10-26T15:00:00.000Z";
const HER_ZONE_NOW = "America/New_York";
const COACH_NOTE = "Something came up on Thursday, does Friday work?";
const CLIENT_NOTE = "Friday works, but an hour later suits me better.";

describe.sequential("check-in new times integration", () => {
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

  describe("proposing", () => {
    it("moves an approved check-in to the coach's new time, waiting for the client, with the earlier time and the coach's note", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
        note: `  ${COACH_NOTE}  `,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "proposed", checkInId });
      expect(await checkIns.movedRowOf(checkInId)).toEqual({
        status: "pending",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        earlierStartsAt: new Date(THURSDAY_FIRST_HOUR),
        moves: 1,
        newTimeNote: COACH_NOTE,
        proposedBy: "coach",
        clientTimeZone: "Europe/London",
        answeredAt: null,
      });
    });

    it("frees the earlier hour for the pickers and the booking page and holds the new one", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);

      // act
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(await checkIns.heldCheckInHours()).toEqual([
        {
          checkInId,
          startsAt: new Date(FRIDAY_FIRST_HOUR),
          endsAt: new Date(FRIDAY_SECOND_HOUR),
        },
      ]);
      const times = await checkIns.openTimesOf(ANA_SESSION);
      expect(times).toContain(THURSDAY_FIRST_HOUR);
      expect(times).not.toContain(FRIDAY_FIRST_HOUR);
      const slots = await sales.openSlots();
      expect(slots).toContain(THURSDAY_FIRST_HOUR);
      expect(slots).not.toContain(FRIDAY_FIRST_HOUR);
    });

    it("emails the client the coach's new time in her zone with the earlier time, the note and her Check-ins page", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);

      // act
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
        note: COACH_NOTE,
      });

      // assert
      const [sent, ...others] = await checkIns.sentEmailsFor(checkInId, {
        moves: 1,
        notification: "newTimeProposed",
      });
      expect(others).toEqual([]);
      expect(sent?.to).toBe(ANA.email);
      expect(sent?.subject).toBe("Eli proposed a new time for your check-in");
      expect(sent?.text).toContain(
        "EARLIER: Thursday, 22 October 2026 at 3:00 PM",
      );
      expect(sent?.text).toContain(
        "NEW TIME: Friday, 23 October 2026 at 3:00 PM",
      );
      expect(sent?.text).toContain("Europe/London");
      expect(sent?.text).not.toContain("Europe/Bucharest");
      expect(sent?.text).toContain(`NOTE: ${COACH_NOTE}`);
      expect(sent?.html).toContain(
        `href="${PUBLIC_ORIGIN}${suite.path("/client/checkins")}"`,
      );
    });

    it("records the client's new time in the zone she proposed from and emails the coach in hers, replying to the client", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);

      // act
      const response = await checkIns.proposeNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
        note: CLIENT_NOTE,
        timeZone: HER_ZONE_NOW,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "pending",
        proposedBy: "client",
        clientTimeZone: HER_ZONE_NOW,
        newTimeNote: CLIENT_NOTE,
      });
      const [sent, ...others] = await checkIns.sentEmailsFor(checkInId, {
        moves: 1,
        notification: "newTimeProposed",
      });
      expect(others).toEqual([]);
      expect(sent?.to).toBe(COACH_EMAIL);
      expect(sent?.replyTo).toBe(ANA.email);
      expect(sent?.subject).toBe(
        "Ana Popescu proposed a new time for your check-in",
      );
      expect(sent?.text).toContain(
        "NEW TIME: Friday, 23 October 2026 at 5:00 PM",
      );
      expect(sent?.text).toContain("Europe/Bucharest");
      expect(sent?.html).toContain(
        `href="${PUBLIC_ORIGIN}${suite.path("/coach/checkins")}"`,
      );
    });

    it("lets the client counter-propose the coach's new time, keeping only the last earlier time and freeing it", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
        note: COACH_NOTE,
      });

      // act
      const response = await checkIns.proposeNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_SECOND_HOUR,
        note: CLIENT_NOTE,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "pending",
        startsAt: new Date(FRIDAY_SECOND_HOUR),
        earlierStartsAt: new Date(FRIDAY_FIRST_HOUR),
        moves: 2,
        newTimeNote: CLIENT_NOTE,
        proposedBy: "client",
      });
      expect(
        (await checkIns.heldCheckInHours()).map(({ startsAt }) => startsAt),
      ).toEqual([new Date(FRIDAY_SECOND_HOUR)]);
    });

    it("keys every new time's email by the move it made", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      await checkIns.proposedNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_SECOND_HOUR,
      });

      // assert
      expect(
        (await checkIns.sentEmailsFor(checkInId))
          .map(({ idempotencyKey }) =>
            idempotencyKey?.slice(idempotencyKey.indexOf("check-in:")),
          )
          .sort(),
      ).toEqual(
        [
          `check-in:${checkInId}:0:requested`,
          `check-in:${checkInId}:0:approved`,
          `check-in:${checkInId}:1:newTimeProposed`,
          `check-in:${checkInId}:2:newTimeProposed`,
        ].sort(),
      );
    });

    it("lets the client propose a new time for the coach's waiting request", async () => {
      // arrange
      const { checkInId } = await coachScheduledAnaForThursday();
      await rig.holdClock(PROPOSED_AT);

      // act
      const response = await checkIns.proposeNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "pending",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        earlierStartsAt: new Date(THURSDAY_FIRST_HOUR),
        moves: 1,
        proposedBy: "client",
      });
    });

    it("leaves her a request of her own beside a check-in moved to a new time", async () => {
      // arrange
      const { checkInId } = await coachScheduledAnaForThursday();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.request(ANA_SESSION, {
        startsAt: MONDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(201);
    });

    it("keeps the new time when the provider refuses the email", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await suite.wireMock.stub(
        resendRejects(`check-in:${checkInId}:1:newTimeProposed`),
      );

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(200);
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "pending",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        moves: 1,
      });
    });
  });

  describe("refusing a new time", () => {
    it("refuses a third new time as exhausted and leaves the check-in as it was", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });
      await checkIns.proposedNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_SECOND_HOUR,
      });

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: MONDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "moves_exhausted" });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        startsAt: new Date(FRIDAY_SECOND_HOUR),
        moves: 2,
        proposedBy: "client",
      });
    });

    it("refuses an hour taken meanwhile and leaves the check-in and its hour as they were", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await sales.bookCallAt(VISITOR, FRIDAY_FIRST_HOUR);
      await rig.holdClock(PROPOSED_AT);

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "time_taken" });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "approved",
        startsAt: new Date(THURSDAY_FIRST_HOUR),
        earlierStartsAt: null,
        moves: 0,
      });
      expect(
        (await checkIns.heldCheckInHours()).map(({ startsAt }) => startsAt),
      ).toEqual([new Date(THURSDAY_FIRST_HOUR)]);
      expect(
        await checkIns.sentEmailsFor(checkInId, {
          moves: 1,
          notification: "newTimeProposed",
        }),
      ).toEqual([]);
    });

    it("refuses an hour at or after the client's coaching end", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await scheduleAnasEnd(new Date("2026-10-23T00:00:00.000Z"));

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "time_taken" });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "approved",
        startsAt: new Date(THURSDAY_FIRST_HOUR),
        moves: 0,
      });
    });

    it("refuses a second new time from the side whose new time is waiting", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.proposeNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_SECOND_HOUR,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        moves: 1,
      });
    });

    it("refuses the proposer taking back her own new time", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.withdraw(COACH_SESSION, checkInId);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "pending",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
      });
    });

    it("refuses the proposer accepting her own new time", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.approve(checkInId, COACH_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect((await checkIns.movedRowOf(checkInId)).status).toBe("pending");
    });

    it("answers not found when another client proposes a new time for the check-in", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await onboarding.admit(MARIA, MARIA_SESSION, SECOND_PURCHASE);
      await rig.holdClock(PROPOSED_AT);
      await onboarding.submit(MARIA_SESSION);

      // act
      const response = await checkIns.proposeNewTime(MARIA_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(response.status).toBe(404);
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "approved",
        moves: 0,
      });
    });

    it("answers not found for a check-in that does not exist", async () => {
      // arrange
      await approvedThursdayCheckIn();

      // act
      const response = await checkIns.proposeNewTime(
        COACH_SESSION,
        "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0",
        { startsAt: FRIDAY_FIRST_HOUR },
      );

      // assert
      expect(response.status).toBe(404);
    });

    it.each([
      {
        what: "a note over 500 characters",
        newTime: { startsAt: FRIDAY_FIRST_HOUR, note: "a".repeat(501) },
        error: "note_too_long",
      },
      {
        what: "a time that is not an instant",
        newTime: { startsAt: "next Friday" },
        error: "invalid_request",
      },
      {
        what: "a zone that names no place",
        newTime: { startsAt: FRIDAY_FIRST_HOUR, timeZone: "Mars/Olympus" },
        error: "invalid_time_zone",
      },
    ])("refuses $what and moves nothing", async ({ newTime, error }) => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);

      // act
      const response = await checkIns.proposeNewTime(
        ANA_SESSION,
        checkInId,
        newTime,
      );

      // assert
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "approved",
        moves: 0,
      });
    });
  });

  describe("answering a new time", () => {
    it("approves the new time on the client's acceptance, keeps the earlier time and emails the coach her join link and invite", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.approve(checkInId, ANA_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "approved", checkInId });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "approved",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        earlierStartsAt: new Date(THURSDAY_FIRST_HOUR),
        moves: 1,
        answeredAt: PROPOSED_AT,
      });
      const [accepted, ...others] = await checkIns.sentEmailsFor(checkInId, {
        moves: 1,
        notification: "newTimeAccepted",
      });
      expect(others).toEqual([]);
      expect(
        await checkIns.sentEmailsFor(checkInId, {
          moves: 1,
          notification: "approved",
        }),
      ).toEqual([]);
      expect(accepted?.to).toBe(COACH_EMAIL);
      expect(accepted?.replyTo).toBe(ANA.email);
      expect(accepted?.subject).toBe("Ana Popescu accepted the new time");
      expect(accepted?.text).toContain(
        "WHEN: Friday, 23 October 2026 at 5:00 PM",
      );
      expect(accepted?.html).toContain(
        `href="${PUBLIC_ORIGIN}${suite.path(`/coach/checkins/${checkInId}/join`)}"`,
      );
      const [invite, ...otherAttachments] = accepted?.attachments ?? [];
      expect(otherAttachments).toEqual([]);
      expect(invite?.contentText).toContain("DTSTART:20261023T140000Z");
    });

    it("emails the client in her zone when the coach accepts her new time", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(ANA_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.approve(checkInId, COACH_SESSION);

      // assert
      expect(response.status).toBe(200);
      const [accepted, ...others] = await checkIns.sentEmailsFor(checkInId, {
        moves: 1,
        notification: "newTimeAccepted",
      });
      expect(others).toEqual([]);
      expect(accepted?.to).toBe(ANA.email);
      expect(accepted?.subject).toBe("Eli accepted the new time");
      expect(accepted?.text).toContain(
        "WHEN: Friday, 23 October 2026 at 3:00 PM",
      );
      expect(accepted?.html).toContain(
        `href="${PUBLIC_ORIGIN}${suite.path(`/client/checkins/${checkInId}/join`)}"`,
      );
    });

    it("cancels the check-in on the client's decline, frees the hour and emails the coach", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // act
      const response = await checkIns.decline(checkInId, ANA_SESSION);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "declined", checkInId });
      expect(await checkIns.movedRowOf(checkInId)).toMatchObject({
        status: "cancelled",
        startsAt: new Date(FRIDAY_FIRST_HOUR),
        earlierStartsAt: new Date(THURSDAY_FIRST_HOUR),
      });
      expect(await checkIns.heldCheckInHours()).toEqual([]);
      expect(await checkIns.openTimesOf(ANA_SESSION)).toEqual(
        expect.arrayContaining([THURSDAY_FIRST_HOUR, FRIDAY_FIRST_HOUR]),
      );
      const [declined, ...others] = await checkIns.sentEmailsFor(checkInId, {
        moves: 1,
        notification: "newTimeDeclined",
      });
      expect(others).toEqual([]);
      expect(declined?.to).toBe(COACH_EMAIL);
      expect(declined?.subject).toBe("Ana Popescu declined the new time");
      expect(declined?.text).toContain("That hour is free again.");
      expect(declined?.attachments).toEqual([]);
    });

    it("refuses a late answer once the new time came unanswered, and emails nobody about it", async () => {
      // arrange
      const checkInId = await approvedThursdayCheckIn();
      await rig.holdClock(PROPOSED_AT);
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });
      await rig.holdClock(new Date(FRIDAY_FIRST_HOUR));

      // act
      const response = await checkIns.approve(checkInId, ANA_SESSION);

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "not_pending" });
      expect((await checkIns.movedRowOf(checkInId)).status).toBe("pending");
      expect(
        await checkIns.sentEmailsFor(checkInId, {
          moves: 1,
          notification: "newTimeAccepted",
        }),
      ).toEqual([]);
    });
  });
});

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

async function approvedThursdayCheckIn(): Promise<string> {
  await submittedAna();
  const checkInId = await checkIns.requested(ANA_SESSION, {
    startsAt: THURSDAY_FIRST_HOUR,
  });
  await checkIns.approved(checkInId);

  return checkInId;
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

async function scheduleAnasEnd(endsAt: Date): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_check_in_new_times_end_scheduled",
    type: "customer.subscription.updated",
    object: stripeSubscriptionObject({ cancel_at: toUnixSeconds(endsAt) }),
    previousAttributes: { cancel_at: null },
  });

  if (delivered.status !== 200) {
    throw new Error(`Scheduling her end answered ${delivered.status}.`);
  }
}
