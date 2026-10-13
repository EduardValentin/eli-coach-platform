import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  emailMomentOf,
  weeklyMomentOf,
  weeklyStartsBetween,
  type WeekBounds,
  type WeeklyHour,
} from "../support/check-in-moments";
import type { PickedCheckIn } from "../support/check-in-picker-dialog";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import { emailTo } from "../support/email-capture";
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
const RESCHEDULE_NOTE = "That Monday is taken, could we meet earlier?";
const OK = 200;
const CONFLICT = 409;
const CANNOT_ANSWER = { error: "client_cannot_answer" };

test.use({ timezoneId: CLIENT_TIME_ZONE });

function weeklyAt(hour: number, day = ONBOARDING_DAY): WeeklyHour {
  return { day, hour, timeZone: COACH_TIME_ZONE };
}

function hourLabelOf({ hour }: WeeklyHour): string {
  return `${String(hour).padStart(2, "0")}:00`;
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

test(
  "the coach sets up a weekly check-in on her onboarding day, reschedules the one week that clashes, and the client keeps one weekly check-in she cannot cancel",
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
    const client = await provisionSubmittedClient("waiting");
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
    await coachClient.expectWeeks(weeks, CLIENT_TIME_ZONE);
    await coachClient.expectOnlyClash(shownIn(clashingWeek!));
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
    await clientCheckIns.expectCoachFindingTime();
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
    await coachCheckIns.expectOneWeeklyUpcoming(client.fullName);
    await coachCheckIns.expectUpcomingAt(client.fullName, shownIn(secondWeek!));

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
    await clientCheckIns.expectOneWeeklyUpcoming(RESCHEDULE_NOTE);
    await clientCheckIns.expectUpcomingAt(RESCHEDULE_NOTE, movedWeek);
    await clientCheckIns.expectNoCancel("Upcoming", RESCHEDULE_NOTE);
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
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeklyRule(ruleOf(setUp));

    // act
    await coachClient.openChangeDialog();

    // assert
    await weeklyCheckInDialog.expectOpen("change");
    await weeklyCheckInDialog.expectWeekdayPreselected(ONBOARDING_DAY);

    // act
    await weeklyCheckInDialog.chooseWeekday(CHANGED_DAY);
    await weeklyCheckInDialog.chooseHour(hourLabelOf(changed));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(CHANGED_TOAST);
    await coachClient.expectWeeklyRule(ruleOf(changed));
    await coachClient.expectWeeks(changedWeeks, CLIENT_TIME_ZONE);
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
      await coachClient.expectNoSetUp();

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
  "the coach sets up and stops a weekly check-in with the keyboard alone, focus returns to the panel each time, and on a phone the dialog opens as a sheet",
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
    await coachClient.expectWeeklyActionFocused("Change");

    // act
    await coachClient.openStopWeeklyWithKeyboard();

    // assert
    await stopWeeklyDialog.expectOpen(stopBodyFor(client.firstName));
    await stopWeeklyDialog.expectFocusTrapped();

    // act
    await stopWeeklyDialog.confirmByKeyboard();

    // assert
    await stopWeeklyDialog.expectClosed();
    await coachClient.expectNoWeeklyCheckIn();
    await coachClient.expectWeeklyActionFocused("Set up");

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
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(weekly));
    await weeklyCheckInDialog.save();
    await coachClient.expectWeeks(
      weeklyStartsBetween(weekly, period),
      CLIENT_TIME_ZONE,
    );

    // act
    const renewal = await deliverSimulatedRenewalPaid({
      baseURL: E2E_APP_URL,
      subscriptionId: client.subscription.subscriptionId,
      periodEnd: renewedThrough,
    });
    await coachClient.open(client.clientId);

    // assert
    expect(renewal.status).toBe(OK);
    await coachClient.expectWeeks(
      weeklyStartsBetween(weekly, { ...period, until: renewedThrough }),
      CLIENT_TIME_ZONE,
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
    await coachClient.expectWeeks(
      weeklyStartsBetween(weekly, {
        from: daysAfter(startedAt, CHECK_IN_LEAD_DAYS),
        until: renewedThrough,
      }),
      CLIENT_TIME_ZONE,
    );
  },
);
