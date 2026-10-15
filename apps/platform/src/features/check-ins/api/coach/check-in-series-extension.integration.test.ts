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
  FIRST_PURCHASE,
  type Purchase,
  type Visitor,
} from "~integration-test-config/coaching-sales-journey";
import { NotificationsJourney } from "~integration-test-config/notifications-journey";
import {
  COACH_SESSION,
  PlatformRig,
  type AccountSession,
} from "~integration-test-config/platform-rig";
import {
  stripeInvoiceObject,
  SubscriptionLifecycleJourney,
} from "~integration-test-config/subscription-lifecycle-journey";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const sales = new CoachingSalesJourney(rig);
const onboarding = new ClientOnboardingJourney(rig, sales);
const checkIns = new CheckInsJourney(rig);
const lifecycle = new SubscriptionLifecycleJourney(rig);
const notifications = new NotificationsJourney(rig);

const ANA_SESSION: AccountSession = {
  sessionId: "sess_checkin_series_extension_ana",
  subjectId: "user_checkin_series_extension_ana",
};

const IOANA: Visitor = {
  email: "ioana.series-extension@example.com",
  firstName: "Ioana",
  gender: "female",
  lastName: "Vlad",
};

const ELENA: Visitor = {
  email: "elena.series-extension@example.com",
  firstName: "Elena",
  gender: "female",
  lastName: "Marin",
};

const PROGRAM_START_API = "/api/coaching-sales/program-start";

const WAITING_PURCHASE: Purchase = {
  ...FIRST_PURCHASE,
  startChoice: "waiting",
};

const NOW = CALL_ENDED_INSTANT;
const THURSDAY_EVENINGS = { weekday: "thursday", hour: 17 } as const;
const FIRST_THURSDAY = "2026-10-22T14:00:00.000Z";
const SECOND_THURSDAY = "2026-10-29T15:00:00.000Z";
const FIRST_THURSDAY_AFTER_DAY_15 = "2026-11-05T15:00:00.000Z";
const LAST_THURSDAY_OF_FIRST_PERIOD = "2027-01-14T15:00:00.000Z";
const FIRST_THURSDAY_OF_RENEWAL = "2027-01-21T15:00:00.000Z";
const LAST_THURSDAY_OF_RENEWAL = "2027-04-15T14:00:00.000Z";
const SECOND_THURSDAY_OF_RENEWAL = "2027-01-28T15:00:00.000Z";
const RENEWED_THROUGH = new Date("2027-04-21T08:00:00.000Z");
const BEFORE_RENEWAL = new Date("2027-01-04T08:00:00.000Z");
const WEEKS_IN_A_PERIOD = 13;

describe.sequential("check-in series extension integration", () => {
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

  it("adds the renewed period's weeks once a renewal invoice is paid, up to the end of the period it pays for", async () => {
    // arrange
    const clientId = await submittedAna();
    const seriesId = await checkIns.seriesSetUp({
      clientId,
      ...THURSDAY_EVENINGS,
    });

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_checkin_series_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle", RENEWED_THROUGH),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await lifecycle.subscriptionPeriod()).toEqual([
      expect.objectContaining({ paidThrough: RENEWED_THROUGH }),
    ]);
    const weeks = await checkIns.seriesWeekRowsOf(seriesId);
    expect(weeks).toHaveLength(2 * WEEKS_IN_A_PERIOD);
    expect(weeks.at(WEEKS_IN_A_PERIOD - 1)?.startsAt).toEqual(
      new Date(LAST_THURSDAY_OF_FIRST_PERIOD),
    );
    expect(weeks.at(WEEKS_IN_A_PERIOD)?.startsAt).toEqual(
      new Date(FIRST_THURSDAY_OF_RENEWAL),
    );
    expect(weeks.at(-1)?.startsAt).toEqual(new Date(LAST_THURSDAY_OF_RENEWAL));
    expect(new Set(weeks.map(({ status }) => status))).toEqual(
      new Set(["approved"]),
    );
    expect(await checkIns.heldCheckInHours()).toHaveLength(
      2 * WEEKS_IN_A_PERIOD,
    );
    expect(await checkIns.seriesRowsOf(clientId)).toEqual([
      expect.objectContaining({ coversUntil: RENEWED_THROUGH }),
    ]);
    expect(await checkIns.sentSeriesEmails(seriesId)).toHaveLength(1);
  });

  it("gives the coach one entry naming how many renewed weeks fall on a taken hour and the earliest of them", async () => {
    // arrange
    const clientId = await submittedAna();
    const seriesId = await checkIns.seriesSetUp({
      clientId,
      ...THURSDAY_EVENINGS,
    });
    await rig.holdClock(BEFORE_RENEWAL);
    await sales.bookCallAt(IOANA, FIRST_THURSDAY_OF_RENEWAL);
    await sales.bookCallAt(ELENA, SECOND_THURSDAY_OF_RENEWAL);
    await rig.holdClock(BEFORE_RENEWAL);

    // act
    await lifecycle.deliverEvent({
      id: "evt_checkin_series_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle", RENEWED_THROUGH),
    });

    // assert
    const earliestClash = (await checkIns.seriesWeekRowsOf(seriesId)).find(
      ({ startsAt }) => startsAt.toISOString() === FIRST_THURSDAY_OF_RENEWAL,
    );
    expect(earliestClash?.status).toBe("clash");
    expect(
      await notifications.entriesOf(COACH_SESSION, "check-in.series-clashes"),
    ).toEqual([
      expect.objectContaining({
        facts: {
          clientName: "Ana Popescu",
          clashes: 2,
          earliestId: earliestClash?.id,
          earliestStartsAt: FIRST_THURSDAY_OF_RENEWAL,
        },
        unread: true,
      }),
    ]);
    expect(
      await notifications.entriesOf(ANA_SESSION, "check-in.series-clashes"),
    ).toEqual([]);
  });

  it("gives the coach no clash entry when every renewed week is free", async () => {
    // arrange
    const clientId = await submittedAna();
    await checkIns.seriesSetUp({ clientId, ...THURSDAY_EVENINGS });

    // act
    await lifecycle.deliverEvent({
      id: "evt_checkin_series_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle", RENEWED_THROUGH),
    });

    // assert
    expect(
      await notifications.entriesOf(COACH_SESSION, "check-in.series-clashes"),
    ).toEqual([]);
  });

  it("adds no week twice when the same renewal is delivered again", async () => {
    // arrange
    const clientId = await submittedAna();
    const seriesId = await checkIns.seriesSetUp({
      clientId,
      ...THURSDAY_EVENINGS,
    });
    const renewal = {
      id: "evt_checkin_series_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle", RENEWED_THROUGH),
    };
    await lifecycle.deliverEvent(renewal);

    // act
    const response = await lifecycle.deliverEvent(renewal);

    // assert
    expect(response.status).toBe(200);
    expect(await checkIns.seriesWeekRowsOf(seriesId)).toHaveLength(
      2 * WEEKS_IN_A_PERIOD,
    );
  });

  it("changes no check-in when the renewed client has no weekly check-in", async () => {
    // arrange
    const clientId = await submittedAna();

    // act
    const response = await lifecycle.deliverEvent({
      id: "evt_checkin_series_renewed",
      type: "invoice.paid",
      object: stripeInvoiceObject("subscription_cycle", RENEWED_THROUGH),
    });

    // assert
    expect(response.status).toBe(200);
    expect(await checkIns.checkInRowsOf(clientId)).toEqual([]);
    expect(await checkIns.seriesRowsOf(clientId)).toEqual([]);
  });

  it("starts the weeks of a waiting client at her program start, and adds the earlier ones once she starts now", async () => {
    // arrange
    const clientId = await submittedAna(WAITING_PURCHASE);
    const seriesId = await checkIns.seriesSetUp({
      clientId,
      ...THURSDAY_EVENINGS,
    });
    const beforeStart = await checkIns.seriesWeekRowsOf(seriesId);

    // act
    const started = await rig.requestAs(ANA_SESSION, PROGRAM_START_API, {
      method: "POST",
    });

    // assert
    expect(beforeStart.at(0)?.startsAt).toEqual(
      new Date(FIRST_THURSDAY_AFTER_DAY_15),
    );
    expect(beforeStart).toHaveLength(WEEKS_IN_A_PERIOD - 2);
    expect(started.status).toBe(200);
    const weeks = await checkIns.seriesWeekRowsOf(seriesId);
    expect(weeks).toHaveLength(WEEKS_IN_A_PERIOD);
    expect(weeks.at(0)?.startsAt).toEqual(new Date(FIRST_THURSDAY));
    expect(weeks.at(1)?.startsAt).toEqual(new Date(SECOND_THURSDAY));
    expect(await checkIns.heldCheckInHours()).toHaveLength(WEEKS_IN_A_PERIOD);
  });
});

async function submittedAna(purchase: Purchase = FIRST_PURCHASE) {
  await onboarding.admit(ANA, ANA_SESSION, purchase);
  await rig.holdClock(NOW);
  await onboarding.submit(ANA_SESSION);

  return onboarding.clientIdOf(ANA_SESSION);
}
