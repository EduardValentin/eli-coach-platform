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
import { NotificationsJourney } from "~integration-test-config/notifications-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const notifications = new NotificationsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_notification_bell_ana",
  subjectId: "user_notification_bell_ana",
};

const MARIA_SESSION: AccountSession = {
  sessionId: "sess_notification_bell_maria",
  subjectId: "user_notification_bell_maria",
};

const MARIA: Visitor = {
  email: "maria.bell@example.com",
  firstName: "Maria",
  gender: "female",
  lastName: "Ionescu",
};

const NOW = CALL_ENDED_INSTANT;
const THURSDAY_FIRST_HOUR = "2026-10-22T14:00:00.000Z";
const FRIDAY_FIRST_HOUR = "2026-10-23T14:00:00.000Z";
const NINETY_ONE_DAYS_LATER = new Date("2027-01-20T08:00:00.000Z");
const LATEST_IN_THE_BELL = 30;

describe.sequential("notification bell integration", () => {
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

  it("lists the coach's own notifications, unread, never cached", async () => {
    // arrange
    await submittedAna();
    const checkInId = await checkIns.requested(ANA_SESSION, {
      startsAt: THURSDAY_FIRST_HOUR,
    });

    // act
    const response = await notifications.bell(COACH_SESSION);

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      notifications: [
        {
          id: expect.any(String) as unknown,
          kind: "check-in.requested",
          facts: {
            checkInId,
            startsAt: THURSDAY_FIRST_HOUR,
            clientName: "Ana Popescu",
          },
          arrivedAt: NOW.toISOString(),
          unread: true,
        },
      ],
      unreadCount: 1,
      checkedAt: NOW.toISOString(),
    });
  });

  it("keeps each client to her own notifications", async () => {
    // arrange
    await submittedAna();
    const checkInId = await checkIns.requested(ANA_SESSION, {
      startsAt: THURSDAY_FIRST_HOUR,
    });
    await checkIns.approved(checkInId);
    await submittedMaria();

    // act
    const anasBell = await notifications.bellOf(ANA_SESSION);
    const mariasBell = await notifications.bellOf(MARIA_SESSION);

    // assert
    expect(anasBell.notifications.map(({ kind }) => kind)).toEqual([
      "check-in.approved",
    ]);
    expect(mariasBell).toMatchObject({ notifications: [], unreadCount: 0 });
  });

  it("answers 404 when a client marks another client's notification read, leaving it unread", async () => {
    // arrange
    await submittedAna();
    const checkInId = await checkIns.requested(ANA_SESSION, {
      startsAt: THURSDAY_FIRST_HOUR,
    });
    await checkIns.approved(checkInId);
    await submittedMaria();
    const [anasEntry] = (await notifications.bellOf(ANA_SESSION)).notifications;

    // act
    const response = await notifications.markRead(
      MARIA_SESSION,
      anasEntry?.id ?? "",
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "unknown_notification" });
    expect(await notifications.bellOf(ANA_SESSION)).toMatchObject({
      unreadCount: 1,
    });
  });

  it("answers 404 when a client marks the coach's notification read", async () => {
    // arrange
    await submittedAna();
    await checkIns.requested(ANA_SESSION, { startsAt: THURSDAY_FIRST_HOUR });
    const [coachsEntry] = (await notifications.bellOf(COACH_SESSION))
      .notifications;

    // act
    const response = await notifications.markRead(
      ANA_SESSION,
      coachsEntry?.id ?? "",
    );

    // assert
    expect(response.status).toBe(404);
    expect(await notifications.bellOf(COACH_SESSION)).toMatchObject({
      unreadCount: 1,
    });
  });

  it("marks one notification read, lowering the unread count by one", async () => {
    // arrange
    await submittedAna();
    await requestedAndWithdrawn(THURSDAY_FIRST_HOUR, 0);
    const [latest] = (await notifications.bellOf(COACH_SESSION)).notifications;

    // act
    const response = await notifications.markRead(
      COACH_SESSION,
      latest?.id ?? "",
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "marked" });
    const bell = await notifications.bellOf(COACH_SESSION);
    expect(bell.unreadCount).toBe(1);
    expect(
      bell.notifications.map(({ kind, unread }) => [kind, unread]),
    ).toEqual([
      ["check-in.withdrawn", false],
      ["check-in.requested", true],
    ]);
  });

  it("marks every notification read at once", async () => {
    // arrange
    await submittedAna();
    await requestedAndWithdrawn(THURSDAY_FIRST_HOUR, 0);

    // act
    const response = await notifications.markAllRead(COACH_SESSION);

    // assert
    expect(response.status).toBe(200);
    const bell = await notifications.bellOf(COACH_SESSION);
    expect(bell.unreadCount).toBe(0);
    expect(bell.notifications.map(({ unread }) => unread)).toEqual([
      false,
      false,
    ]);
  });

  it("lists the latest 30 notifications newest first while counting every unread one", async () => {
    // arrange
    await submittedAna();
    for (let round = 0; round < 15; round += 1) {
      await requestedAndWithdrawn(THURSDAY_FIRST_HOUR, 2 * round);
    }
    await rig.holdClock(minutesAfterNow(30));
    const lastRequestId = await checkIns.requested(ANA_SESSION, {
      startsAt: FRIDAY_FIRST_HOUR,
    });

    // act
    const bell = await notifications.bellOf(COACH_SESSION);

    // assert
    expect(bell.notifications).toHaveLength(LATEST_IN_THE_BELL);
    expect(bell.unreadCount).toBe(31);
    expect(bell.notifications[0]).toMatchObject({
      kind: "check-in.requested",
      facts: { checkInId: lastRequestId },
    });
  });

  it("drops notifications older than 90 days from the bell", async () => {
    // arrange
    await submittedAna();
    await requestedAndWithdrawn(THURSDAY_FIRST_HOUR, 0);
    await rig.holdClock(NINETY_ONE_DAYS_LATER);

    // act
    const bell = await notifications.bellOf(COACH_SESSION);

    // assert
    expect(bell).toEqual({
      notifications: [],
      unreadCount: 0,
      checkedAt: NINETY_ONE_DAYS_LATER.toISOString(),
    });
  });

  it("answers 401 to a visitor who is not signed in", async () => {
    // arrange
    await submittedAna();

    // act
    const response = await notifications.signedOutBell();

    // assert
    expect(response.status).toBe(401);
  });
});

function minutesAfterNow(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

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

async function requestedAndWithdrawn(
  startsAt: string,
  minute: number,
): Promise<void> {
  await rig.holdClock(minutesAfterNow(minute));
  const checkInId = await checkIns.requested(ANA_SESSION, { startsAt });
  await rig.holdClock(minutesAfterNow(minute + 1));
  const withdrawn = await checkIns.withdraw(ANA_SESSION, checkInId);

  if (withdrawn.status !== 200) {
    throw new Error(`Withdrawing the request answered ${withdrawn.status}.`);
  }
}
