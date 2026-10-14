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
import { toUnixSeconds } from "~integration-test-config/wire-mock/expectations/stripe-api";

const COACH_EMAIL = "eli@evoa.fit";

const suite = new ApiIntegrationTestSuite({
  environment: { ASSESSMENT_CALL_COACH_EMAIL: COACH_EMAIL },
});
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_checkin_series_ana",
  subjectId: "user_checkin_series_ana",
};

const VISITOR: Visitor = {
  email: "ioana.series@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const NOW = CALL_ENDED_INSTANT;
const THURSDAY_EVENINGS = { weekday: "thursday", hour: 17 } as const;
const FRIDAY_EVENINGS = { weekday: "friday", hour: 18 } as const;
const FIRST_THURSDAY = "2026-10-22T14:00:00.000Z";
const FIRST_THURSDAY_LATER_HOUR = "2026-10-22T15:00:00.000Z";
const SECOND_THURSDAY = "2026-10-29T15:00:00.000Z";
const SECOND_FRIDAY_EARLIER_HOUR = "2026-10-30T15:00:00.000Z";
const LAST_THURSDAY = "2027-01-14T15:00:00.000Z";
const FIRST_FRIDAY = "2026-10-23T15:00:00.000Z";
const LAST_FRIDAY = "2027-01-15T16:00:00.000Z";
const WEEKS_IN_HER_PERIOD = 13;
const UNKNOWN_SERIES_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";

describe.sequential("check-in series integration", () => {
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

  describe("setting up", () => {
    it("books an approved week at the coach's hour for every Thursday of her paid period, holding each hour", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(201);
      const { seriesId } = (await response.json()) as { seriesId: string };
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([
        expect.objectContaining({
          id: seriesId,
          weekday: "thursday",
          hour: 17,
          timeZone: "Europe/Bucharest",
          stoppedAt: null,
        }),
      ]);
      const weeks = await checkIns.seriesWeekRowsOf(seriesId);
      expect(weeks).toHaveLength(WEEKS_IN_HER_PERIOD);
      expect(weeks.at(0)?.startsAt).toEqual(new Date(FIRST_THURSDAY));
      expect(weeks.at(1)?.startsAt).toEqual(new Date(SECOND_THURSDAY));
      expect(weeks.at(-1)?.startsAt).toEqual(new Date(LAST_THURSDAY));
      expect(
        new Set(weeks.map(({ kind, status }) => `${kind}:${status}`)),
      ).toEqual(new Set(["recurring:approved"]));
      expect(await checkIns.heldCheckInHours()).toHaveLength(
        WEEKS_IN_HER_PERIOD,
      );
    });

    it("offers the held hours to nobody, neither as a check-in nor on the booking page", async () => {
      // arrange
      const clientId = await submittedAna();
      await checkIns.seriesSetUp({ clientId, ...THURSDAY_EVENINGS });

      // act
      const checkInTimes = await checkIns.openTimesOfClient(clientId);
      const callSlots = await sales.openSlots();

      // assert
      expect(checkInTimes).not.toContain(FIRST_THURSDAY);
      expect(checkInTimes).toContain(FIRST_THURSDAY_LATER_HOUR);
      expect(callSlots).not.toContain(FIRST_THURSDAY);
    });

    it("emails her once with the weekday and time in her zone and the first week", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      const emails = await checkIns.sentSeriesEmails(seriesId);
      expect(emails).toHaveLength(1);
      expect(emails[0]?.to).toBe(ANA.email);
      expect(emails[0]?.subject).toBe("Eli set up a weekly check-in with you");
      expect(emails[0]?.text).toContain(
        "WHEN: Every Thursday at 3:00 PM — Europe/London (GMT+1)",
      );
      expect(emails[0]?.text).toContain(
        "FIRST WEEK: Thursday, 22 October 2026 at 3:00 PM",
      );
      expect(emails[0]?.attachments).toEqual([]);
    });

    it("makes the week a booked call holds a clash that holds nothing, after the preview counted it", async () => {
      // arrange
      const clientId = await submittedAna();
      await sales.bookCallAt(VISITOR, FIRST_THURSDAY);
      await rig.holdClock(NOW);
      const preview = await checkIns.previewSeries(COACH_SESSION, {
        clientId,
        weekday: "thursday",
      });

      // act
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      expect(preview.status).toBe(200);
      expect(await preview.json()).toMatchObject({
        weekdays: expect.arrayContaining(["thursday"]),
        hours: expect.arrayContaining([
          { hour: 17, weeks: WEEKS_IN_HER_PERIOD, clashes: 1 },
          { hour: 18, weeks: WEEKS_IN_HER_PERIOD, clashes: 0 },
        ]),
      });
      const weeks = await checkIns.seriesWeekRowsOf(seriesId);
      expect(weeks.at(0)).toMatchObject({
        startsAt: new Date(FIRST_THURSDAY),
        status: "clash",
      });
      expect(weeks.slice(1).map(({ status }) => status)).not.toContain("clash");
      expect(
        (await checkIns.heldCheckInHours()).map(({ checkInId }) => checkInId),
      ).not.toContain(weeks.at(0)?.id);
    });

    it("leaves her own weekly check-in out of the clashes the preview counts", async () => {
      // arrange
      const clientId = await submittedAna();
      await checkIns.seriesSetUp({ clientId, ...THURSDAY_EVENINGS });

      // act
      const preview = await checkIns.previewSeries(COACH_SESSION, {
        clientId,
        weekday: "thursday",
      });

      // assert
      expect(await preview.json()).toMatchObject({
        hours: expect.arrayContaining([
          { hour: 17, weeks: WEEKS_IN_HER_PERIOD, clashes: 0 },
        ]),
      });
    });

    it("refuses a second weekly check-in for the same client", async () => {
      // arrange
      const clientId = await submittedAna();
      await checkIns.seriesSetUp({ clientId, ...THURSDAY_EVENINGS });

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        ...FRIDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "series_exists" });
      expect(await checkIns.seriesRowsOf(clientId)).toHaveLength(1);
    });

    it("refuses an hour outside the coach's availability", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        weekday: "saturday",
        hour: 17,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "outside_availability" });
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([]);
    });

    it("refuses a client still onboarding", async () => {
      // arrange
      await onboarding.admit(ANA, ANA_SESSION);
      await rig.holdClock(NOW);
      const clientId = await onboarding.clientIdOf(ANA_SESSION);

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "client_cannot_answer" });
    });

    it("refuses the client herself", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const response = await checkIns.setUpSeries(ANA_SESSION, {
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(403);
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([]);
    });
  });

  describe("the weeks", () => {
    it("lets the coach cancel a week and refuses the client", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      const [first] = await checkIns.seriesWeekRowsOf(seriesId);

      // act
      const byClient = await checkIns.cancel(ANA_SESSION, first?.id ?? "");
      const byCoach = await checkIns.cancel(COACH_SESSION, first?.id ?? "");

      // assert
      expect(byClient.status).toBe(409);
      expect(byCoach.status).toBe(200);
      expect((await checkIns.seriesWeekRowsOf(seriesId)).at(0)?.status).toBe(
        "cancelled",
      );
    });

    it("moves a clash to a new time that waits for her, spending no move and holding the new hour", async () => {
      // arrange
      const clientId = await submittedAna();
      await sales.bookCallAt(VISITOR, FIRST_THURSDAY);
      await rig.holdClock(NOW);
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      const [clash] = await checkIns.seriesWeekRowsOf(seriesId);

      // act
      const response = await checkIns.proposeNewTime(
        COACH_SESSION,
        clash?.id ?? "",
        { startsAt: FIRST_THURSDAY_LATER_HOUR },
      );

      // assert
      expect(response.status).toBe(200);
      expect(await checkIns.movedRowOf(clash?.id ?? "")).toMatchObject({
        status: "pending",
        startsAt: new Date(FIRST_THURSDAY_LATER_HOUR),
        earlierStartsAt: new Date(FIRST_THURSDAY),
        moves: 0,
        proposedBy: "coach",
      });
      expect(await checkIns.heldCheckInHours()).toContainEqual({
        checkInId: clash?.id,
        startsAt: new Date(FIRST_THURSDAY_LATER_HOUR),
        endsAt: new Date("2026-10-22T16:00:00.000Z"),
      });
    });

    it("lets her move only her next week and refuses a later one with 409", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      const [next, later] = await checkIns.seriesWeekRowsOf(seriesId);

      // act
      const onLater = await checkIns.proposeNewTime(
        ANA_SESSION,
        later?.id ?? "",
        { startsAt: FIRST_THURSDAY_LATER_HOUR },
      );
      const onNext = await checkIns.proposeNewTime(
        ANA_SESSION,
        next?.id ?? "",
        { startsAt: FIRST_THURSDAY_LATER_HOUR },
      );

      // assert
      expect(onLater.status).toBe(409);
      expect(await onLater.json()).toEqual({ error: "not_next_weekly" });
      expect(onNext.status).toBe(200);
      expect(await checkIns.movedRowOf(later?.id ?? "")).toMatchObject({
        status: "approved",
        startsAt: new Date(SECOND_THURSDAY),
        moves: 0,
      });
    });
  });

  describe("changing", () => {
    it("cancels every week still to come, moved and waiting ones included, and books the new day and hour", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      const [, second] = await checkIns.seriesWeekRowsOf(seriesId);
      await checkIns.proposedNewTime(COACH_SESSION, second?.id ?? "", {
        startsAt: SECOND_FRIDAY_EARLIER_HOUR,
      });

      // act
      const response = await checkIns.changeSeries(
        COACH_SESSION,
        seriesId,
        FRIDAY_EVENINGS,
      );

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "changed", seriesId });
      const weeks = await checkIns.seriesWeekRowsOf(seriesId);
      const thursdays = weeks.filter(
        ({ startsAt }) => startsAt.getUTCDay() === 4,
      );
      const kept = weeks.filter(({ status }) => status !== "cancelled");
      expect(new Set(thursdays.map(({ status }) => status))).toEqual(
        new Set(["cancelled"]),
      );
      expect(weeks.find(({ id }) => id === second?.id)?.status).toBe(
        "cancelled",
      );
      expect(kept).toHaveLength(WEEKS_IN_HER_PERIOD);
      expect(kept.at(0)?.startsAt).toEqual(new Date(FIRST_FRIDAY));
      expect(kept.at(-1)?.startsAt).toEqual(new Date(LAST_FRIDAY));
      expect(
        (await checkIns.heldCheckInHours()).map(({ checkInId }) => checkInId),
      ).toEqual(kept.map(({ id }) => id));
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([
        expect.objectContaining({
          weekday: "friday",
          hour: 18,
          changedAt: NOW,
        }),
      ]);
    });

    it("emails her the new weekday and time and the first new week", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // act
      await checkIns.changeSeries(COACH_SESSION, seriesId, FRIDAY_EVENINGS);

      // assert
      const emails = await checkIns.sentSeriesEmails(seriesId, "seriesChanged");
      expect(emails).toHaveLength(1);
      expect(emails[0]?.subject).toBe("Eli changed your weekly check-in");
      expect(emails[0]?.text).toContain(
        "WHEN: Every Friday at 4:00 PM — Europe/London (GMT+1)",
      );
      expect(emails[0]?.text).toContain(
        "FIRST WEEK: Friday, 23 October 2026 at 4:00 PM",
      );
    });

    it("answers 404 for a series that does not exist", async () => {
      // arrange
      await submittedAna();

      // act
      const response = await checkIns.changeSeries(
        COACH_SESSION,
        UNKNOWN_SERIES_ID,
        FRIDAY_EVENINGS,
      );

      // assert
      expect(response.status).toBe(404);
    });
  });

  describe("stopping", () => {
    it("cancels every week still to come, frees every hour and emails her", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // act
      const response = await checkIns.stopSeries(COACH_SESSION, seriesId);

      // assert
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "stopped", seriesId });
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([
        expect.objectContaining({ stoppedAt: NOW }),
      ]);
      expect(
        new Set(
          (await checkIns.seriesWeekRowsOf(seriesId)).map(
            ({ status }) => status,
          ),
        ),
      ).toEqual(new Set(["cancelled"]));
      expect(await checkIns.heldCheckInHours()).toEqual([]);
      const emails = await checkIns.sentSeriesEmails(seriesId, "seriesStopped");
      expect(emails).toHaveLength(1);
      expect(emails[0]?.subject).toBe("Eli stopped your weekly check-in");
      expect(emails[0]?.text).toContain(
        "WHEN: Every Thursday at 3:00 PM — Europe/London (GMT+1)",
      );
      expect(emails[0]?.text).toContain("The hours are free again.");
    });

    it("lets the coach set up a new weekly check-in once the last one stopped", async () => {
      // arrange
      const clientId = await submittedAna();
      const stopped = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      await checkIns.stopSeries(COACH_SESSION, stopped);

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        ...FRIDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(201);
      expect(await checkIns.seriesRowsOf(clientId)).toHaveLength(2);
    });

    it("answers 404 when the series is already stopped", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      await checkIns.stopSeries(COACH_SESSION, seriesId);

      // act
      const response = await checkIns.stopSeries(COACH_SESSION, seriesId);

      // assert
      expect(response.status).toBe(404);
      expect(
        await checkIns.sentSeriesEmails(seriesId, "seriesStopped"),
      ).toHaveLength(1);
    });
  });

  describe("the end of her coaching", () => {
    it("stops her weekly check-in, cancels its weeks and frees their hours", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // act
      await endAnasCoaching();

      // assert
      expect(await checkIns.seriesRowsOf(clientId)).toEqual([
        expect.objectContaining({ stoppedAt: NOW }),
      ]);
      expect(
        new Set(
          (await checkIns.seriesWeekRowsOf(seriesId)).map(
            ({ status }) => status,
          ),
        ),
      ).toEqual(new Set(["cancelled"]));
      expect(await checkIns.heldCheckInHours()).toEqual([]);
    });

    it("refuses a weekly check-in for a client whose coaching ended", async () => {
      // arrange
      const clientId = await submittedAna();
      await endAnasCoaching();

      // act
      const response = await checkIns.setUpSeries(COACH_SESSION, {
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "client_cannot_answer" });
    });
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
    id: "evt_checkin_series_coaching_ended",
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
