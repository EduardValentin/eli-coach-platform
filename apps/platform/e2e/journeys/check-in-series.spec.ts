import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  clockTimeOf,
  emailMomentOf,
  shortDayOf,
  weeklyMomentOf,
  weeklyStartsBetween,
  type WeekBounds,
  type WeeklyHour,
} from "../support/check-in-moments";
import type { PickedCheckIn } from "../support/check-in-picker-dialog";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  COACH_NOTIFICATION_EMAIL,
  emailTo,
  refuseEmailsTo,
  subjectsTo,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import { daysAfter } from "../support/paid-clients";
import { deliverSimulatedRenewalPaid } from "../support/stripe-events";
import { paidThrough } from "../support/subscribed-clients";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const BOOKING_TIME_ZONE = "America/New_York";
const JOURNEY_TIMEOUT_MS = 300_000;
const WITHDRAWAL_DAYS = 14;
const CHECK_IN_LEAD_DAYS = 1;
const DAYS_PER_WEEK = 7;
const ONBOARDING_DAY = "Monday";
const CHANGED_DAY = "Wednesday";
const SET_UP_SUBJECT = `${COACH_DISPLAY_NAME} set up a weekly check-in with you`;
const CHANGED_SUBJECT = `${COACH_DISPLAY_NAME} changed your weekly check-in`;
const STOPPED_SUBJECT = `${COACH_DISPLAY_NAME} stopped your weekly check-in`;
const SET_UP_TOAST = "Weekly check-in set up";
const CHANGED_TOAST = "Weekly check-in changed";
const STOPPED_TOAST = "Weekly check-in stopped";
const COACH_PROPOSED_SUBJECT = `${COACH_DISPLAY_NAME} proposed a new time for your check-in`;
const COACH_ACCEPTED_SUBJECT = `${COACH_DISPLAY_NAME} accepted the new time`;
const COACH_CANCELLED_SUBJECT = `${COACH_DISPLAY_NAME} cancelled the check-in`;
const RESCHEDULE_NOTE = "That Monday is taken, could we meet earlier?";
const CLASH_NOTE = "Your usual hour is taken that week, how about this one?";
const CLIENT_MOVE_NOTE = "I'm travelling that day, could we meet then?";
const COACH_MOVE_NOTE = "Something came up, could we meet at this time?";
const MOVED_WEEK_NOTE = "Let's meet a little earlier that week.";
const OK = 200;
const CONFLICT = 409;
const CANNOT_ANSWER = { error: "client_cannot_answer" };
const MOVES_EXHAUSTED = { error: "moves_exhausted" };
const NOT_NEXT_WEEKLY = { error: "not_next_weekly" };
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOURS_SINCE_PASSED = 3;
const SWITCHED_WEEKDAYS = ["Tuesday", CHANGED_DAY, ONBOARDING_DAY] as const;

test.use({ timezoneId: CLIENT_TIME_ZONE });

function weeklyAt(hour: number, day = ONBOARDING_DAY): WeeklyHour {
  return { day, hour, timeZone: COACH_TIME_ZONE };
}

function hourLabelOf({ hour }: WeeklyHour): string {
  return clockTimeOf(new Date(Date.UTC(2000, 0, 1, hour)), "UTC");
}

function ruleOf(weekly: WeeklyHour): string {
  return `Every ${weekly.day} at ${hourLabelOf(weekly)}`;
}

function waitingPeriodOf(paidAt: Date): WeekBounds {
  return {
    from: daysAfter(paidAt, WITHDRAWAL_DAYS),
    until: paidThrough(paidAt),
  };
}

function shownIn(startsAt: Date): PickedCheckIn {
  return { startsAt, timeZone: CLIENT_TIME_ZONE };
}

function stopBodyFor(firstName: string): string {
  return `Every week still to come is cancelled and ${firstName} is told.`;
}

function dayAndTimeOf(startsAt: Date): string {
  return `${shortDayOf(startsAt, CLIENT_TIME_ZONE)} at ${clockTimeOf(startsAt, CLIENT_TIME_ZONE)}`;
}

function wholeHoursAgo(hours: number): Date {
  return new Date((Math.floor(Date.now() / HOUR_MS) - hours) * HOUR_MS);
}

function weeklyHourOf(instant: Date): WeeklyHour {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: COACH_TIME_ZONE,
    weekday: "long",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return {
    day: part("weekday"),
    hour: Number(part("hour")),
    timeZone: COACH_TIME_ZONE,
  };
}

test(
  "the coach sets up a weekly check-in on her onboarding day, reschedules the one week that clashes, and the client sees every week, may move only the next one and cancel none",
  { tag: "@critical" },
  async ({
    bookingPage,
    checkInProposeDialog,
    checkInRecords,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
    page,
    provisionClientInState,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting", "approved");
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    const weekly = weeklyAt(18);
    const weeks = weeklyStartsBetween(weekly, waitingPeriodOf(client.paidAt));
    const [clashingWeek, secondWeek] = weeks;
    const holder = await provisionClientInState("approved");
    await checkInRecords.holdHourFor(
      holder.clientId,
      clashingWeek!,
      COACH_TIME_ZONE,
    );
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectNoWeeklyCheckIn();

    // act
    await coachClient.openWeeklyDialog();

    // assert
    await weeklyCheckInDialog.expectOpen("set-up");
    await weeklyCheckInDialog.expectWeekdayPreselected(ONBOARDING_DAY);
    await weeklyCheckInDialog.expectClashes(hourLabelOf(weekly), 1);
    await weeklyCheckInDialog.expectNoClash(hourLabelOf(weeklyAt(17)));

    // act
    await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(SET_UP_TOAST);
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(weeks);
    const setUpEmail = await emailTo(client.email, SET_UP_SUBJECT);
    expect(setUpEmail.text).toContain(
      weeklyMomentOf(clashingWeek!, BOOKING_TIME_ZONE),
    );
    expect(setUpEmail.text).toContain(
      emailMomentOf(clashingWeek!, BOOKING_TIME_ZONE),
    );
    expect(setUpEmail.links).toContain(`${E2E_APP_URL}/client/checkins`);
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const clashProblems = collectPageProblems(page);

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectCoachFindingTimeFirst();
    expect(clashProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const reschedulingProblems = collectPageProblems(page);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectClashFirst(client.fullName);
    await coachCheckIns.expectEveryWeeklyUpcoming(
      client.fullName,
      weeks.slice(1).map(shownIn),
    );

    // act
    await coachCheckIns.reschedule("Requests", client.fullName);
    const movedWeek = await checkInProposeDialog.sendSoonest(RESCHEDULE_NOTE);

    // assert
    expect(reschedulingProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const acceptingProblems = collectPageProblems(page);
    await clientCheckIns.open();

    // act
    await clientCheckIns.accept(RESCHEDULE_NOTE);

    // assert
    await clientCheckIns.expectEveryWeeklyUpcoming([
      movedWeek,
      ...weeks.slice(1).map(shownIn),
    ]);
    await clientCheckIns.expectUpcomingAt(RESCHEDULE_NOTE, movedWeek);
    await clientCheckIns.expectNextWeekMovable(movedWeek);
    await clientCheckIns.expectLaterWeekHeldBack(shownIn(secondWeek!));
    expect(acceptingProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourNotOffered(secondWeek!, CLIENT_TIME_ZONE);
  },
);

test(
  "the coach changes the weekly check-in to another day and hour, then stops it, the client is told each time, and the booking page gets the hours back",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInRecords,
    coachAvailability,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signInAsCoach,
    stopWeeklyDialog,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    const period = waitingPeriodOf(client.paidAt);
    const setUp = weeklyAt(17);
    const changed = weeklyAt(16, CHANGED_DAY);
    const [firstSetUpWeek] = weeklyStartsBetween(setUp, period);
    const changedWeeks = weeklyStartsBetween(changed, period);
    const [firstChangedWeek] = changedWeeks;
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(setUp));

    // act + assert
    await weeklyCheckInDialog.expectHoursHold(
      hourLabelOf(setUp),
      SWITCHED_WEEKDAYS,
    );

    // arrange
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeklyRule(ruleOf(setUp));

    // act
    await coachClient.openChangeDialog();

    // assert
    await weeklyCheckInDialog.expectOpen("change");
    await weeklyCheckInDialog.expectWeekdayPreselected(setUp.day);
    await weeklyCheckInDialog.expectHourPreselected(hourLabelOf(setUp));

    // act
    await weeklyCheckInDialog.chooseWeekday(CHANGED_DAY);
    await weeklyCheckInDialog.chooseHour(hourLabelOf(changed));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(CHANGED_TOAST);
    await coachClient.expectWeeklyRule(ruleOf(changed));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(changedWeeks);
    const changedEmail = await emailTo(client.email, CHANGED_SUBJECT);
    expect(changedEmail.text).toContain(
      weeklyMomentOf(firstChangedWeek!, BOOKING_TIME_ZONE),
    );
    expect(changedEmail.text).toContain(
      emailMomentOf(firstChangedWeek!, BOOKING_TIME_ZONE),
    );
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(firstSetUpWeek!, CLIENT_TIME_ZONE);
    await bookingPage.expectHourNotOffered(firstChangedWeek!, CLIENT_TIME_ZONE);

    // arrange
    await page.goto("/store");
    await signInAsCoach();
    const stoppingProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);

    // act
    await coachClient.openStopWeekly();

    // assert
    await stopWeeklyDialog.expectOpen(stopBodyFor(client.firstName));

    // act
    const stoppedAt = new Date();
    await stopWeeklyDialog.confirm();

    // assert
    await stopWeeklyDialog.expectClosed();
    await coachClient.expectToast(STOPPED_TOAST);
    await coachClient.expectNoWeeklyCheckIn();
    const [nextChangedWeek] = weeklyStartsBetween(changed, {
      from: stoppedAt,
      until: daysAfter(stoppedAt, DAYS_PER_WEEK),
    });
    const stoppedEmail = await emailTo(client.email, STOPPED_SUBJECT);
    expect(stoppedEmail.text).toContain(
      weeklyMomentOf(nextChangedWeek!, BOOKING_TIME_ZONE),
    );
    expect(stoppingProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(firstChangedWeek!, CLIENT_TIME_ZONE);
  },
);

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test(
    "a client still onboarding shows Set up held back with its reason, a client whose coaching ended shows no action, and setting up for either is refused",
    { tag: "@completeness" },
    async ({
      checkInRequests,
      coachAvailability,
      coachClient,
      page,
      portalRequests,
      provisionClientInState,
      provisionCoach,
      provisionSubscribedClient,
      publicNav,
      signIn,
      signInAsCoach,
    }) => {
      test.setTimeout(JOURNEY_TIMEOUT_MS);

      // arrange
      await coachAvailability.openEveryDay();
      await provisionCoach();
      const onboarding = await provisionClientInState("onboarding");
      const ended = await provisionSubscribedClient({
        start: "waiting",
        daysSincePayment: 3,
      });
      await page.goto("/store");
      await signIn();
      expect((await portalRequests.cancelSubscription()).status).toBe(OK);
      await page.goto("/");
      await publicNav.signOut();
      await page.goto("/store");
      await signInAsCoach();
      const weekly = { weekday: "monday", hour: 18 };

      // act
      await coachClient.open(onboarding.clientId);

      // assert
      await coachClient.expectSetUpBlocked(onboarding.gender);
      await coachClient.expectSetUpReasonOnHover(onboarding.gender);
      await coachClient.expectSetUpReasonOnFocus(onboarding.gender);
      await coachClient.expectSetUpReasonOnTap(onboarding.gender);

      // act
      const onboardingAnswer = await checkInRequests.setUpSeries(
        onboarding.clientId,
        weekly,
      );

      // assert
      expect(onboardingAnswer).toEqual({
        status: CONFLICT,
        body: CANNOT_ANSWER,
      });

      // act
      await coachClient.open(ended.clientId);

      // assert
      await coachClient.expectNoSetUpOnceCoachingEnded(ended.gender);

      // act
      const endedAnswer = await checkInRequests.setUpSeries(
        ended.clientId,
        weekly,
      );

      // assert
      expect(endedAnswer).toEqual({ status: CONFLICT, body: CANNOT_ANSWER });
    },
  );
});

test(
  "the coach sets up, keeps and stops a weekly check-in with the keyboard alone, focus returns to the panel each time, and on a phone the dialog opens as a sheet",
  { tag: "@completeness" },
  async ({
    coachAvailability,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
    stopWeeklyDialog,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    const weekly = weeklyAt(10);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.openWeeklyDialogWithKeyboard();

    // assert
    await weeklyCheckInDialog.expectOpen("set-up");

    // act
    await weeklyCheckInDialog.chooseHourByKeyboard(hourLabelOf(weekly));
    await weeklyCheckInDialog.saveByKeyboard();

    // assert
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await coachClient.expectWeeklyMenuFocused();

    // act
    await coachClient.openStopWeeklyWithKeyboard();

    // assert
    await stopWeeklyDialog.expectOpen(stopBodyFor(client.firstName));
    await stopWeeklyDialog.expectFocusTrapped();

    // act
    await stopWeeklyDialog.dismissByKeyboard();

    // assert
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await coachClient.expectWeeklyMenuFocused();

    // act
    await coachClient.openStopWeeklyWithKeyboard();
    await stopWeeklyDialog.confirmByKeyboard();

    // assert
    await stopWeeklyDialog.expectClosed();
    await coachClient.expectNoWeeklyCheckIn();
    await coachClient.expectSetUpFocused();

    // arrange
    await setPhoneViewport(page);

    // act
    await coachClient.openWeeklyDialog();

    // assert
    await weeklyCheckInDialog.expectOpenAsSheet("set-up");
    await expectNoHorizontalScroll(page);
  },
);

test(
  "a paid renewal adds the next period's weeks to the weekly check-in, and letting Eli start now adds the weeks before the old start",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    clientDashboard,
    coachAvailability,
    coachClient,
    page,
    provisionCoach,
    provisionSubscribedClient,
    publicNav,
    signIn,
    signInAsCoach,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    const weekly = weeklyAt(12);
    const period = waitingPeriodOf(client.paidAt);
    const renewedThrough = paidThrough(period.until);
    const setUpWeeks = weeklyStartsBetween(weekly, period);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(setUpWeeks);

    // act
    const renewal = await deliverSimulatedRenewalPaid({
      baseURL: E2E_APP_URL,
      subscriptionId: client.subscription.subscriptionId,
      periodEnd: renewedThrough,
    });
    await coachClient.open(client.clientId);

    // assert
    expect(renewal.status).toBe(OK);
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(
        weeklyStartsBetween(weekly, { ...period, until: renewedThrough }),
      );

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientDashboard.open();

    // act
    const startNow = await clientDashboard.openStartNow();
    const startedAt = new Date();
    await startNow.confirm();

    // assert
    await startNow.expectClosed();

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachClient.open(client.clientId);

    // assert
    const startedWeeks = weeklyStartsBetween(weekly, {
      from: daysAfter(startedAt, CHECK_IN_LEAD_DAYS),
      until: renewedThrough,
    });
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(startedWeeks);
  },
);

test.describe("while a clash waits for the coach", () => {
  test.beforeEach(async ({ checkInRecords }) => {
    await checkInRecords.cancelWaitingRequests();
    await checkInRecords.cancelUpcomingClashes();
  });

  test.afterEach(async ({ checkInRecords }) => {
    await checkInRecords.cancelUpcomingClashes();
  });

  test(
    "a clash counts as waiting on the coach until its hour, then nobody having moved it, it shows cancelled in Past on both pages and the client is told nothing",
    { tag: "@completeness" },
    async ({
      checkInRecords,
      clientCheckIns,
      coachAvailability,
      coachCheckIns,
      coachClient,
      coachDashboard,
      page,
      provisionClientInState,
      provisionCoach,
      provisionSubmittedClient,
      publicNav,
      signIn,
      signInAsCoach,
      weeklyCheckInDialog,
    }) => {
      test.setTimeout(JOURNEY_TIMEOUT_MS);

      // arrange
      await coachAvailability.openEveryDay();
      await provisionCoach();
      const client = await provisionSubmittedClient("waiting");
      const weekly = weeklyAt(15);
      const [clashingWeek] = weeklyStartsBetween(
        weekly,
        waitingPeriodOf(client.paidAt),
      );
      const holder = await provisionClientInState("approved");
      await checkInRecords.proposeHourFor(
        holder.clientId,
        clashingWeek!,
        COACH_TIME_ZONE,
      );
      await page.goto("/store");
      await signInAsCoach();
      const coachProblems = collectPageProblems(page);
      await coachClient.open(client.clientId);
      await coachClient.openWeeklyDialog();
      await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
      await weeklyCheckInDialog.save();
      await coachClient.expectWeeklyRule(ruleOf(weekly));
      await emailTo(client.email, SET_UP_SUBJECT);

      // act
      await coachDashboard.open();

      // assert
      await coachDashboard.expectPendingCheckIns([client.fullName]);
      await coachCheckIns.expectNavigationCount(1);

      // act
      await coachCheckIns.open();

      // assert
      await coachCheckIns.expectWaitingCount(1);
      await coachCheckIns.expectClashFirst(client.fullName);

      // arrange
      const passedAt = wholeHoursAgo(HOURS_SINCE_PASSED);
      await checkInRecords.moveStartTo(
        await checkInRecords.idOf(client.clientId, clashingWeek!),
        passedAt,
      );

      // act
      await coachCheckIns.open();

      // assert
      await coachCheckIns.expectCancelledInPast(
        client.fullName,
        shownIn(passedAt),
      );
      await coachCheckIns.expectNavigationCount(0);
      expect(coachProblems).toEqual([]);

      // arrange
      await page.goto("/");
      await publicNav.signOut();
      await page.goto("/store");
      await signIn();
      const clientProblems = collectPageProblems(page);

      // act
      await clientCheckIns.open();

      // assert
      await clientCheckIns.expectCancelledInPast(shownIn(passedAt));
      expect(await subjectsTo(client.email)).toEqual([SET_UP_SUBJECT]);
      expect(clientProblems).toEqual([]);
    },
  );

  test(
    "weeks already set up stay when the coach closes their day, and the weeks a paid renewal adds on that day arrive as clashes",
    { tag: "@completeness" },
    async ({
      checkInRecords,
      coachAvailability,
      coachCheckIns,
      coachClient,
      coachSettings,
      page,
      provisionCoach,
      provisionSubscribedClient,
      signInAsCoach,
      weeklyCheckInDialog,
    }) => {
      test.setTimeout(JOURNEY_TIMEOUT_MS);

      // arrange
      await coachAvailability.openEveryDay();
      await provisionCoach();
      const client = await provisionSubscribedClient({
        start: "waiting",
        daysSincePayment: 3,
      });
      const weekly = weeklyAt(13);
      const period = waitingPeriodOf(client.paidAt);
      const renewedThrough = paidThrough(period.until);
      const setUpWeeks = weeklyStartsBetween(weekly, period);
      const renewedWeeks = weeklyStartsBetween(weekly, {
        from: period.until,
        until: renewedThrough,
      });
      await page.goto("/store");
      await signInAsCoach();
      const coachProblems = collectPageProblems(page);
      await coachClient.open(client.clientId);
      await coachClient.openWeeklyDialog();
      await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
      await weeklyCheckInDialog.save();
      await coachClient.expectWeeklyRule(ruleOf(weekly));

      // act
      await coachSettings.open();
      await coachSettings.closeDay(ONBOARDING_DAY);
      await coachSettings.save();
      await coachClient.open(client.clientId);

      // assert
      await coachClient.expectWeeklyRule(ruleOf(weekly));
      expect(await checkInRecords.weeksToComeOf(client.clientId)).toEqual(
        setUpWeeks,
      );

      // act
      await coachCheckIns.open();

      // assert
      await coachCheckIns.expectClashesAt(client.fullName, []);

      // act
      const renewal = await deliverSimulatedRenewalPaid({
        baseURL: E2E_APP_URL,
        subscriptionId: client.subscription.subscriptionId,
        periodEnd: renewedThrough,
      });
      await coachCheckIns.open();

      // assert
      expect(renewal.status).toBe(OK);
      await coachCheckIns.expectClashesAt(
        client.fullName,
        renewedWeeks.map(shownIn),
      );
      expect(await checkInRecords.weeksToComeOf(client.clientId)).toEqual([
        ...setUpWeeks,
        ...renewedWeeks,
      ]);
      expect(coachProblems).toEqual([]);
    },
  );
});

test(
  "a new time for a clash spends neither of its two moves, either side then moves the weekly check-in with the usual emails, and the client sees every weekly check-in but may move only the next one, Reschedule on a later one held back with its reason",
  { tag: "@completeness" },
  async ({
    checkInProposeDialog,
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
    page,
    provisionClientInState,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    const weekly = weeklyAt(14);
    const [clashingWeek, secondWeek] = weeklyStartsBetween(
      weekly,
      waitingPeriodOf(client.paidAt),
    );
    const holder = await provisionClientInState("approved");
    await checkInRecords.proposeHourFor(
      holder.clientId,
      clashingWeek!,
      COACH_TIME_ZONE,
    );
    await page.goto("/store");
    await signInAsCoach();
    const clashProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await coachClient.openAllCheckIns();

    // act
    await coachCheckIns.reschedule("Requests", client.fullName);
    await checkInProposeDialog.sendSoonest(CLASH_NOTE);

    // assert
    const clashEmail = await emailTo(client.email, COACH_PROPOSED_SUBJECT);
    expect(clashEmail.text).toContain(CLASH_NOTE);
    expect(clashProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);
    await clientCheckIns.open();
    await clientCheckIns.accept(CLASH_NOTE);

    // act
    await clientCheckIns.reschedule("Upcoming", CLASH_NOTE);
    await checkInProposeDialog.sendSoonest(CLIENT_MOVE_NOTE);

    // assert
    await clientCheckIns.expectOwnWeeklyNewTime(CLIENT_MOVE_NOTE);
    const clientMoveEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} proposed a new time for your check-in`,
    );
    expect(clientMoveEmail.text).toContain(CLIENT_MOVE_NOTE);
    expect(clientProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const movingProblems = collectPageProblems(page);
    await coachCheckIns.open();
    await coachCheckIns.accept(client.fullName);
    await emailTo(client.email, COACH_ACCEPTED_SUBJECT);

    // act
    await coachCheckIns.reschedule("Upcoming", CLIENT_MOVE_NOTE);
    const coachMove = await checkInProposeDialog.sendSoonest(COACH_MOVE_NOTE);

    // assert
    await coachCheckIns.expectOwnWeeklyNewTime(COACH_MOVE_NOTE);
    const coachMoveEmail = await emailTo(client.email, COACH_PROPOSED_SUBJECT);
    expect(coachMoveEmail.text).toContain(COACH_MOVE_NOTE);
    expect(movingProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.accept(COACH_MOVE_NOTE);
    const [openTime] = await checkInRequests.openTimes();
    const movedWeekId = await checkInRecords.idOf(
      client.clientId,
      coachMove.startsAt,
    );
    const secondWeekId = await checkInRecords.idOf(
      client.clientId,
      secondWeek!,
    );

    // act
    const movedAgain = await checkInRequests.proposeNewTime(movedWeekId, {
      startsAt: openTime!,
      timeZone: CLIENT_TIME_ZONE,
    });
    const secondWeekMoved = await checkInRequests.proposeNewTime(secondWeekId, {
      startsAt: openTime!,
      timeZone: CLIENT_TIME_ZONE,
    });

    // assert
    expect(movedAgain).toEqual({ status: CONFLICT, body: MOVES_EXHAUSTED });
    expect(secondWeekMoved).toEqual({
      status: CONFLICT,
      body: NOT_NEXT_WEEKLY,
    });
    await clientCheckIns.expectUpcomingAt(COACH_MOVE_NOTE, coachMove);
    await clientCheckIns.expectLaterWeekHeldBack(shownIn(secondWeek!));
    await clientCheckIns.expectLaterWeekReasonOnHover(shownIn(secondWeek!));
    await clientCheckIns.expectLaterWeekReasonOnFocus(shownIn(secondWeek!));
  },
);

test(
  "the coach cancels the next week and moves the one after from the Check-ins page, reached each time from the weekly check-in's View all check-ins link, with the usual emails and none for the weeks themselves, and a change replaces the moved week while a past week stays",
  { tag: "@completeness" },
  async ({
    cancelCheckInDialog,
    checkInProposeDialog,
    checkInRecords,
    coachAvailability,
    coachCheckIns,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    const period = waitingPeriodOf(client.paidAt);
    const setUp = weeklyAt(11);
    const changed = weeklyAt(10, CHANGED_DAY);
    const weeks = weeklyStartsBetween(setUp, period);
    const [cancelledWeek, movedWeek, heldWeek] = weeks;
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(setUp));
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeklyRule(ruleOf(setUp));
    await emailTo(client.email, SET_UP_SUBJECT);

    // act
    await coachClient.openAllCheckIns();

    // assert
    await coachCheckIns.expectEveryWeeklyUpcoming(
      client.fullName,
      weeks.map(shownIn),
    );

    // act
    await coachCheckIns.cancelWeek(
      "Upcoming",
      client.fullName,
      shownIn(cancelledWeek!),
    );

    // assert
    await cancelCheckInDialog.expectOpen(
      `${dayAndTimeOf(cancelledWeek!)} with ${client.fullName}.`,
    );

    // act
    await cancelCheckInDialog.confirm();

    // assert
    await coachCheckIns.expectCancelledToast(client.fullName);
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(weeks.filter((week) => week !== cancelledWeek));
    const cancellationEmail = await emailTo(
      client.email,
      COACH_CANCELLED_SUBJECT,
    );
    expect(cancellationEmail.text).toContain(
      emailMomentOf(cancelledWeek!, BOOKING_TIME_ZONE),
    );

    // arrange
    await coachClient.open(client.clientId);
    await coachClient.expectWeeklyRule(ruleOf(setUp));

    // act
    await coachClient.openAllCheckIns();

    // assert
    await coachCheckIns.expectEveryWeeklyUpcoming(
      client.fullName,
      weeks.slice(1).map(shownIn),
    );

    // act
    await coachCheckIns.rescheduleWeek(
      "Upcoming",
      client.fullName,
      shownIn(movedWeek!),
    );
    const newTime = await checkInProposeDialog.sendSoonest(MOVED_WEEK_NOTE);

    // assert
    const proposalEmail = await emailTo(client.email, COACH_PROPOSED_SUBJECT);
    expect(proposalEmail.text).toContain(MOVED_WEEK_NOTE);
    expect(await subjectsTo(client.email)).toEqual([
      COACH_PROPOSED_SUBJECT,
      COACH_CANCELLED_SUBJECT,
      SET_UP_SUBJECT,
    ]);

    // arrange
    const heldWeekId = await checkInRecords.idOf(client.clientId, heldWeek!);
    const heldAt = wholeHoursAgo(HOURS_SINCE_PASSED);
    await checkInRecords.freeHourOf(heldWeekId);
    await checkInRecords.moveStartTo(heldWeekId, heldAt);
    await coachClient.open(client.clientId);
    const changedWeeks = weeklyStartsBetween(changed, period);

    // act
    await coachClient.openChangeDialog();
    await weeklyCheckInDialog.chooseWeekday(CHANGED_DAY);
    await weeklyCheckInDialog.chooseHour(hourLabelOf(changed));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(CHANGED_TOAST);
    await coachClient.expectWeeklyRule(ruleOf(changed));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(changedWeeks);
    await emailTo(client.email, CHANGED_SUBJECT);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectCancelledInPast(MOVED_WEEK_NOTE, newTime);
    await coachCheckIns.expectHeldInPast(client.fullName, shownIn(heldAt));
    expect(coachProblems).toEqual([]);
  },
);

test(
  "with her emails refused, the coach still sets up and stops a weekly check-in for a client who started now, whose first week is a full day away and whose hour no other client is offered",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInScheduleDialog,
    coachAvailability,
    coachClient,
    page,
    provisionClientInState,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
    stopWeeklyDialog,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openAroundTheClock();
    await provisionCoach();
    const client = await provisionSubmittedClient("immediate");
    const other = await provisionClientInState("approved");
    await refuseEmailsTo(client.email);
    const settingUpAt = new Date();
    const weekly = weeklyHourOf(new Date(settingUpAt.getTime() + DAY_MS));
    const weeks = weeklyStartsBetween(weekly, {
      from: new Date(settingUpAt.getTime() + DAY_MS),
      until: paidThrough(client.paidAt),
    });
    const [firstWeek] = weeks;
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseWeekday(weekly.day);

    // act
    await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(SET_UP_TOAST);
    await coachClient.expectWeeklyRule(ruleOf(weekly));
    await expect
      .poll(() => checkInRecords.weeksToComeOf(client.clientId))
      .toEqual(weeks);
    expect(firstWeek!.getTime() - settingUpAt.getTime()).toBeGreaterThan(
      DAYS_PER_WEEK * DAY_MS,
    );

    // act
    await coachClient.open(other.clientId);
    await coachClient.openScheduleDialog();

    // assert
    await checkInScheduleDialog.expectNotOffered(shownIn(firstWeek!));
    await checkInScheduleDialog.expectOffers(
      shownIn(new Date(firstWeek!.getTime() - HOUR_MS)),
    );

    // arrange
    await coachClient.open(client.clientId);

    // act
    await coachClient.openStopWeekly();
    await stopWeeklyDialog.confirm();

    // assert
    await stopWeeklyDialog.expectClosed();
    await coachClient.expectToast(STOPPED_TOAST);
    await coachClient.expectNoWeeklyCheckIn();
    expect(await subjectsTo(client.email)).toEqual([]);
    expect(coachProblems).toEqual([]);
  },
);
