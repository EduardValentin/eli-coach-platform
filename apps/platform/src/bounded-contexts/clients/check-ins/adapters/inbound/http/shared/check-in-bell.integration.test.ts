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
import { NotificationsJourney } from "~integration-test-config/notifications-journey";
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

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const notifications = new NotificationsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_check_in_bell_ana",
  subjectId: "user_check_in_bell_ana",
};

const VISITOR: Visitor = {
  email: "ioana.bell@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const NOW = CALL_ENDED_INSTANT;
const ANA_FULL_NAME = "Ana Popescu";
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";
const FIRST_FRIDAY_EVENING = "2026-10-23T15:00:00.000Z";
const THURSDAY_EVENINGS = { weekday: "thursday", hour: 17 } as const;
const FRIDAY_EVENINGS = { weekday: "friday", hour: 18 } as const;
const AFTER_THURSDAY_FIRST_HOUR = new Date("2026-10-22T14:30:00.000Z");
const AFTER_FRIDAY_FIRST_HOUR = new Date("2026-10-23T14:30:00.000Z");

const EXPIRY_KINDS = [
  "check-in.request-expired",
  "check-in.new-time-expired",
  "check-in.clash-missed",
];

const SERIES_KINDS = [
  "check-in.series-set-up",
  "check-in.series-changed",
  "check-in.series-stopped",
  "check-in.series-clashes",
];

describe.sequential("check-in bell integration", () => {
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

  describe("check-in events", () => {
    it("tells the coach about the client's request with her full name, and not the client", async () => {
      // arrange
      await submittedAna();

      // act
      const checkInId = await checkIns.requested(ANA_SESSION, {
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.requested"),
      ).toEqual([
        expect.objectContaining({
          facts: {
            checkInId,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
          arrivedAt: NOW.toISOString(),
          unread: true,
        }),
      ]);
      expect(await notifications.entriesOf(ANA_SESSION)).toEqual([]);
    });

    it("tells the client about the check-in the coach scheduled, without naming her, and not the coach", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const checkInId = await checkIns.scheduled({
        clientId,
        startsAt: THURSDAY_FIRST_HOUR,
      });

      // assert
      expect(await notifications.entriesOf(ANA_SESSION)).toEqual([
        expect.objectContaining({
          kind: "check-in.requested",
          facts: { checkInId, startsAt: THURSDAY_FIRST_HOUR },
        }),
      ]);
      expect(await notifications.entriesOf(COACH_SESSION)).toEqual([]);
    });

    it("tells the coach the client withdrew her request", async () => {
      // arrange
      await submittedAna();
      const checkInId = await requestedThursday();

      // act
      await checkIns.withdraw(ANA_SESSION, checkInId);

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.withdrawn"),
      ).toEqual([
        expect.objectContaining({
          facts: {
            checkInId,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
        }),
      ]);
      expect(await notifications.entriesOf(ANA_SESSION)).toEqual([]);
    });

    it.each([
      { answer: "approve", kind: "check-in.approved" },
      { answer: "decline", kind: "check-in.declined" },
    ] as const)(
      "tells the client the coach's answer when the coach answers $answer",
      async ({ answer, kind }) => {
        // arrange
        await submittedAna();
        const checkInId = await requestedThursday();

        // act
        await checkIns[answer](checkInId);

        // assert
        expect(await notifications.entriesOf(ANA_SESSION)).toEqual([
          expect.objectContaining({
            kind,
            facts: { checkInId, startsAt: THURSDAY_FIRST_HOUR },
          }),
        ]);
        expect(await notifications.entriesOf(COACH_SESSION, kind)).toEqual([]);
      },
    );

    it("tells the client the new time the coach proposed", async () => {
      // arrange
      await submittedAna();
      const checkInId = await approvedThursday();

      // act
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });

      // assert
      expect(
        await notifications.entriesOf(
          ANA_SESSION,
          "check-in.new-time-proposed",
        ),
      ).toEqual([
        expect.objectContaining({
          facts: { checkInId, startsAt: FRIDAY_FIRST_HOUR },
        }),
      ]);
      expect(
        await notifications.entriesOf(
          COACH_SESSION,
          "check-in.new-time-proposed",
        ),
      ).toEqual([]);
    });

    it.each([
      { answer: "approve", kind: "check-in.new-time-accepted" },
      { answer: "decline", kind: "check-in.new-time-declined" },
    ] as const)(
      "tells the coach the client's answer to her new time when the client answers $answer",
      async ({ answer, kind }) => {
        // arrange
        await submittedAna();
        const checkInId = await approvedThursday();
        await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
          startsAt: FRIDAY_FIRST_HOUR,
        });

        // act
        await checkIns[answer](checkInId, ANA_SESSION);

        // assert
        expect(await notifications.entriesOf(COACH_SESSION, kind)).toEqual([
          expect.objectContaining({
            facts: {
              checkInId,
              startsAt: FRIDAY_FIRST_HOUR,
              clientName: ANA_FULL_NAME,
            },
          }),
        ]);
        expect(await notifications.entriesOf(ANA_SESSION, kind)).toEqual([]);
      },
    );

    it("tells the coach the client cancelled their approved check-in", async () => {
      // arrange
      await submittedAna();
      const checkInId = await approvedThursday();

      // act
      await checkIns.cancel(ANA_SESSION, checkInId);

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.cancelled"),
      ).toEqual([
        expect.objectContaining({
          facts: {
            checkInId,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
        }),
      ]);
      expect(
        await notifications.entriesOf(ANA_SESSION, "check-in.cancelled"),
      ).toEqual([]);
    });

    it("keeps the entry when the email for the event is refused", async () => {
      // arrange
      await submittedAna();
      await suite.wireMock.stub(resendRejects("check-in:"));

      // act
      const checkInId = await requestedThursday();

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.requested"),
      ).toEqual([
        expect.objectContaining({
          facts: expect.objectContaining({ checkInId }),
        }),
      ]);
    });
  });

  describe("weekly check-in events", () => {
    it("tells the client her weekly check-in was set up, with her first week, and not the coach", async () => {
      // arrange
      const clientId = await submittedAna();

      // act
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // assert
      const [firstWeek] = await checkIns.seriesWeekRowsOf(seriesId);
      expect(await notifications.entriesOf(ANA_SESSION)).toEqual([
        expect.objectContaining({
          kind: "check-in.series-set-up",
          facts: {
            firstWeekId: firstWeek?.id,
            firstWeekStartsAt: THURSDAY_FIRST_HOUR,
          },
        }),
      ]);
      expect(
        seriesEntriesOf(await notifications.entriesOf(COACH_SESSION)),
      ).toEqual([]);
    });

    it("tells the client her weekly check-in changed, with her first new week", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // act
      await checkIns.changeSeries(COACH_SESSION, seriesId, FRIDAY_EVENINGS);

      // assert
      const firstFriday = (await checkIns.seriesWeekRowsOf(seriesId)).find(
        ({ startsAt }) => startsAt.toISOString() === FIRST_FRIDAY_EVENING,
      );
      expect(
        await notifications.entriesOf(ANA_SESSION, "check-in.series-changed"),
      ).toEqual([
        expect.objectContaining({
          facts: {
            firstWeekId: firstFriday?.id,
            firstWeekStartsAt: FIRST_FRIDAY_EVENING,
          },
        }),
      ]);
      expect(
        seriesEntriesOf(await notifications.entriesOf(COACH_SESSION)),
      ).toEqual([]);
    });

    it("tells the client her weekly check-in stopped", async () => {
      // arrange
      const clientId = await submittedAna();
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });

      // act
      await checkIns.stopSeries(COACH_SESSION, seriesId);

      // assert
      expect(
        await notifications.entriesOf(ANA_SESSION, "check-in.series-stopped"),
      ).toEqual([expect.objectContaining({ facts: {} })]);
      expect(
        seriesEntriesOf(await notifications.entriesOf(COACH_SESSION)),
      ).toEqual([]);
    });

    it("gives the coach no entry for the clashing weeks she set up herself", async () => {
      // arrange
      const clientId = await submittedAna();
      await sales.bookCallAt(VISITOR, THURSDAY_FIRST_HOUR);
      await rig.holdClock(NOW);

      // act
      await checkIns.seriesSetUp({ clientId, ...THURSDAY_EVENINGS });

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.series-clashes"),
      ).toEqual([]);
    });
  });

  describe("expiries", () => {
    it("records an unanswered request once in both bells, arriving when its time passed", async () => {
      // arrange
      await submittedAna();
      const checkInId = await requestedThursday();
      await rig.holdClock(AFTER_THURSDAY_FIRST_HOUR);
      await notifications.bellOf(COACH_SESSION);
      await notifications.bellOf(ANA_SESSION);

      // act
      const coachEntries = await notifications.entriesOf(
        COACH_SESSION,
        "check-in.request-expired",
      );
      const clientEntries = await notifications.entriesOf(
        ANA_SESSION,
        "check-in.request-expired",
      );

      // assert
      expect(coachEntries).toEqual([
        expect.objectContaining({
          facts: {
            checkInId,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
          arrivedAt: THURSDAY_FIRST_HOUR,
          unread: true,
        }),
      ]);
      expect(clientEntries).toEqual([
        expect.objectContaining({
          facts: { checkInId, startsAt: THURSDAY_FIRST_HOUR },
          arrivedAt: THURSDAY_FIRST_HOUR,
        }),
      ]);
    });

    it("records an expiry once when two reads of the bell race", async () => {
      // arrange
      await submittedAna();
      await requestedThursday();
      await rig.holdClock(AFTER_THURSDAY_FIRST_HOUR);

      // act
      const reads = await Promise.all([
        notifications.bell(COACH_SESSION),
        notifications.bell(COACH_SESSION),
      ]);

      // assert
      expect(reads.map(({ status }) => status)).toEqual([200, 200]);
      expect(
        await notifications.entriesOf(
          COACH_SESSION,
          "check-in.request-expired",
        ),
      ).toHaveLength(1);
    });

    it("records an unanswered new time once in both bells", async () => {
      // arrange
      await submittedAna();
      const checkInId = await approvedThursday();
      await checkIns.proposedNewTime(COACH_SESSION, checkInId, {
        startsAt: FRIDAY_FIRST_HOUR,
      });
      await rig.holdClock(AFTER_FRIDAY_FIRST_HOUR);

      // act
      await notifications.bellOf(COACH_SESSION);
      await notifications.bellOf(ANA_SESSION);

      // assert
      expect(
        await notifications.entriesOf(
          COACH_SESSION,
          "check-in.new-time-expired",
        ),
      ).toEqual([
        expect.objectContaining({
          facts: {
            checkInId,
            startsAt: FRIDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
          arrivedAt: FRIDAY_FIRST_HOUR,
        }),
      ]);
      expect(
        await notifications.entriesOf(ANA_SESSION, "check-in.new-time-expired"),
      ).toEqual([
        expect.objectContaining({
          facts: { checkInId, startsAt: FRIDAY_FIRST_HOUR },
        }),
      ]);
    });

    it("records a clash nobody moved once in both bells", async () => {
      // arrange
      const clientId = await submittedAna();
      await sales.bookCallAt(VISITOR, THURSDAY_FIRST_HOUR);
      await rig.holdClock(NOW);
      const seriesId = await checkIns.seriesSetUp({
        clientId,
        ...THURSDAY_EVENINGS,
      });
      const [clash] = await checkIns.seriesWeekRowsOf(seriesId);
      await rig.holdClock(AFTER_THURSDAY_FIRST_HOUR);

      // act
      await notifications.bellOf(COACH_SESSION);
      await notifications.bellOf(ANA_SESSION);

      // assert
      expect(
        await notifications.entriesOf(COACH_SESSION, "check-in.clash-missed"),
      ).toEqual([
        expect.objectContaining({
          facts: {
            checkInId: clash?.id,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: ANA_FULL_NAME,
          },
        }),
      ]);
      expect(
        await notifications.entriesOf(ANA_SESSION, "check-in.clash-missed"),
      ).toEqual([
        expect.objectContaining({
          facts: { checkInId: clash?.id, startsAt: THURSDAY_FIRST_HOUR },
        }),
      ]);
    });

    it("records nothing for the check-ins her coaching end cancelled", async () => {
      // arrange
      await submittedAna();
      const approvedId = await checkIns.requested(ANA_SESSION, {
        startsAt: FRIDAY_FIRST_HOUR,
      });
      await checkIns.approved(approvedId);
      await requestedThursday();
      await endAnasCoaching();
      await rig.holdClock(AFTER_FRIDAY_FIRST_HOUR);

      // act
      const coachEntries = await notifications.entriesOf(COACH_SESSION);

      // assert
      expect(
        coachEntries.filter(
          ({ kind }) =>
            EXPIRY_KINDS.includes(kind) || kind === "check-in.cancelled",
        ),
      ).toEqual([]);
      expect(await notifications.entriesOf(ANA_SESSION)).toEqual([]);
    });
  });
});

function seriesEntriesOf<T extends { kind: string }>(entries: T[]): T[] {
  return entries.filter(({ kind }) => SERIES_KINDS.includes(kind));
}

async function submittedAna(): Promise<string> {
  await onboarding.admit(ANA, ANA_SESSION);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}

function requestedThursday(): Promise<string> {
  return checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });
}

async function approvedThursday(): Promise<string> {
  const checkInId = await requestedThursday();
  await checkIns.approved(checkInId);

  return checkInId;
}

async function endAnasCoaching(): Promise<void> {
  const delivered = await lifecycle.deliverEvent({
    id: "evt_check_in_bell_coaching_ended",
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
