import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  clockTimeOf,
  shortDayOf,
  spacedPattern,
  weeklyStartsBetween,
  type WeeklyHour,
} from "../support/check-in-moments";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  COACH_NOTIFICATION_EMAIL,
  refuseEmailsTo,
  subjectsTo,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import { deliverSimulatedRenewalPaid } from "../support/stripe-events";
import { paidThrough } from "../support/subscribed-clients";
import { setPhoneViewport } from "../support/viewport";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BROWSER_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const REQUEST_NOTE = "Can we look at my deadlift?";
const REQUESTED = "Check-in requested";
const APPROVED = "Check-in approved";
const DECLINED = "Check-in declined";
const APPROVED_NOTE = "Could we go over my meal plan?";
const DECLINED_NOTE = "Could we look at my progress photos?";
const PHONE_NOTE = "Sent from my phone.";
const CANCELLED = "Check-in cancelled";
const SET_UP = "Weekly check-in set up";
const CHANGED = "Weekly check-in changed";
const STOPPED = "Weekly check-in stopped";
const FIRST_HOUR = 11;
const CHANGED_HOUR = 14;
const CHANGED_DAY = "Wednesday";
const EXPIRED = "Check-in request expired";
const UNANSWERED_NOTE = "Nobody answered this one.";
const HOURS_SINCE_PASSED = 3;
const HOUR_MS = 60 * 60 * 1000;
const THREE_HOURS_AGO = /3 h ago/;
const WITHDRAWAL_DAYS = 14;
const CLASHING_DAY = "Monday";
const CLASHING_HOUR = 13;
const OK = 200;
const COACHING_END_DAYS_SINCE_PAYMENT = 84;
const END_MARGIN_MS = 2 * HOUR_MS;
const COACHING_ENDS_NOTE = "A check-in right as your plan ends.";
const AFTER_COACHING_NOTE = "A check-in after your plan ends.";
const JUST_ARRIVED = /Just now|\d+ min ago/;

test.use({ timezoneId: BROWSER_TIME_ZONE });

function requestedLineOf(clientName: string, startsAt: Date): RegExp {
  const when = `${shortDayOf(startsAt, BROWSER_TIME_ZONE)} at ${clockTimeOf(startsAt, BROWSER_TIME_ZONE)}`;

  return new RegExp(
    spacedPattern(`${clientName} asked for a check-in on ${when}.`),
  );
}

function hourLabelOf(hour: number): string {
  return clockTimeOf(new Date(Date.UTC(2000, 0, 1, hour)), "UTC");
}

function weeklyRuleOf(firstWeek: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BROWSER_TIME_ZONE,
    weekday: "long",
  }).format(firstWeek);
  const from = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: BROWSER_TIME_ZONE,
  }).format(firstWeek);

  return `every ${weekday} at ${clockTimeOf(firstWeek, BROWSER_TIME_ZONE)}, from ${from}`;
}

function momentLineOf(actor: string, action: string, startsAt: Date): RegExp {
  const when = `${shortDayOf(startsAt, BROWSER_TIME_ZONE)} at ${clockTimeOf(startsAt, BROWSER_TIME_ZONE)}`;

  return new RegExp(spacedPattern(`${actor} ${action} on ${when}.`));
}

function clientReviewUrlOf(checkInId: string): RegExp {
  return new RegExp(`/client/checkins\\?checkin=${checkInId}$`);
}

function coachReviewUrlOf(checkInId: string): RegExp {
  return new RegExp(`/coach/checkins\\?checkin=${checkInId}$`);
}

test(
  "the coach's bell names her client's check-in request and opens it",
  { tag: "@critical" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
    notificationBell,
    notificationRecords,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await notificationRecords.markCoachNotificationsRead();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(REQUEST_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );
    const requestedLine = requestedLineOf(client.fullName, requested.startsAt);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachDashboard.open();

    // assert
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRow(REQUESTED, requestedLine);

    // act
    await notificationBell.openRow(REQUESTED, requestedLine);

    // assert
    await expect(page).toHaveURL(coachReviewUrlOf(checkInId));
    await coachCheckIns.expectReviewLanded(client.fullName);
    await notificationBell.expectUnread(0);
  },
);

test(
  "the client's bell starts empty, then lists her coach's answers newest first with the time that passed, opens each on the tab holding it from any page, and mark all read clears it for good",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    clientDashboard,
    coachAvailability,
    coachCheckIns,
    notificationBell,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await notificationBell.expectInSidebar("Client");
    await notificationBell.expectUnread(0);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectEmpty();

    // act
    await notificationBell.closeWithEscape();
    await clientCheckIns.openRequestDialog();
    const declined = await checkInRequestDialog.sendSoonest(DECLINED_NOTE);
    const declinedId = await checkInRecords.idOf(
      client.clientId,
      declined.startsAt,
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();
    await coachCheckIns.decline(client.fullName);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const approved = await checkInRequestDialog.sendSoonest(APPROVED_NOTE);
    const approvedId = await checkInRecords.idOf(
      client.clientId,
      approved.startsAt,
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();
    await coachCheckIns.approve(client.fullName);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // assert
    await notificationBell.expectUnread(2);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRowsInOrder([APPROVED, DECLINED]);
    const approvedLine = momentLineOf(
      COACH_DISPLAY_NAME,
      "approved the check-in",
      approved.startsAt,
    );
    const declinedLine = momentLineOf(
      COACH_DISPLAY_NAME,
      "declined the check-in",
      declined.startsAt,
    );
    await notificationBell.expectRow(APPROVED, approvedLine);
    await notificationBell.expectRow(DECLINED, declinedLine);
    await notificationBell.expectRowUnread(APPROVED, approvedLine, true);
    await notificationBell.expectRowUnread(DECLINED, declinedLine, true);
    await notificationBell.expectRowAge(APPROVED, approvedLine, JUST_ARRIVED);

    // act
    await notificationBell.openRow(DECLINED, declinedLine);

    // assert
    await expect(page).toHaveURL(clientReviewUrlOf(declinedId));
    await clientCheckIns.expectReviewLanded("Past", DECLINED_NOTE);
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRowUnread(DECLINED, declinedLine, false);
    await notificationBell.expectRowUnread(APPROVED, approvedLine, true);

    // act
    await notificationBell.markAllRead();

    // assert
    await notificationBell.expectUnread(0);

    // arrange
    await clientDashboard.open();

    // assert
    await notificationBell.expectUnread(0);

    // act
    await notificationBell.open();
    await notificationBell.openRow(APPROVED, approvedLine);

    // assert
    await expect(page).toHaveURL(clientReviewUrlOf(approvedId));
    await clientCheckIns.expectReviewLanded("Upcoming", APPROVED_NOTE);
    await notificationBell.expectUnread(0);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRowCount(2);

    // arrange
    await notificationBell.closeWithEscape();
    await setPhoneViewport(page);

    // act
    await clientCheckIns.open();

    // assert
    await notificationBell.expectInTopBar("Client");

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectOpenAsSheet();
    await notificationBell.expectRowCount(2);
  },
);

test(
  "on a phone the coach's bell opens as a sheet and works by keyboard with focus back on the bell, and a notification arriving while she is on the Check-ins page lights the bell within a minute with a toast whose View lands on the tab holding it",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
    notificationBell,
    notificationRecords,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await notificationRecords.markCoachNotificationsRead();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(PHONE_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );
    const requestedLine = requestedLineOf(client.fullName, requested.startsAt);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await setPhoneViewport(page);
    await notificationBell.installClock();

    // act
    await coachDashboard.open();

    // assert
    await notificationBell.expectInTopBar("Coach");
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.openByKeyboard();

    // assert
    await notificationBell.expectOpenAsSheet();
    await notificationBell.expectRow(REQUESTED, requestedLine);

    // act
    await notificationBell.closeWithEscape();

    // assert
    await notificationBell.expectTriggerFocused();

    // act
    await notificationBell.openByKeyboard();
    await notificationBell.openRowByKeyboard(REQUESTED, requestedLine);

    // assert
    await expect(page).toHaveURL(coachReviewUrlOf(checkInId));
    await coachCheckIns.expectReviewLanded(client.fullName);
    await notificationBell.expectUnread(0);

    // arrange
    const later = new Date(requested.startsAt.getTime() + WEEK_MS);
    await checkInRecords.holdHourFor(client.clientId, later, COACH_TIME_ZONE);
    const laterId = await checkInRecords.idOf(client.clientId, later);
    await checkInRecords.markApproved(laterId);
    await notificationRecords.arriveForCoach("check-in.cancelled", {
      checkInId: laterId,
      clientName: client.fullName,
      startsAt: later.toISOString(),
    });

    // act
    await notificationBell.waitForMinuteCheck();

    // assert
    await notificationBell.expectToast(CANCELLED);
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.viewToastByKeyboard(CANCELLED);

    // assert
    await expect(page).toHaveURL(coachReviewUrlOf(laterId));
    await coachCheckIns.expectReviewLandedOn("Upcoming", client.fullName);
    await notificationBell.expectUnread(0);
  },
);

test(
  "with her emails refused, the coach's weekly check-in set up, changed and stopped still reach the client's bell in order, her own actions add nothing to the coach's bell, and the stopped one opens her Check-ins page",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    clientCheckIns,
    coachAvailability,
    coachClient,
    coachDashboard,
    notificationBell,
    notificationRecords,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
    stopWeeklyDialog,
    weeklyCheckInDialog,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await refuseEmailsTo(client.email);
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await notificationRecords.markCoachNotificationsRead();
    await notificationBell.expectInSidebar("Coach");
    await coachClient.open(client.clientId);

    // act
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(FIRST_HOUR));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(SET_UP);
    await expect
      .poll(
        async () =>
          (await checkInRecords.weeksToComeOf(client.clientId)).length,
      )
      .toBeGreaterThan(0);
    const [setUpFirstWeek] = await checkInRecords.weeksToComeOf(
      client.clientId,
    );

    // act
    await coachClient.openChangeDialog();
    await weeklyCheckInDialog.chooseWeekday(CHANGED_DAY);
    await weeklyCheckInDialog.chooseHour(hourLabelOf(CHANGED_HOUR));
    await weeklyCheckInDialog.save();

    // assert
    await coachClient.expectToast(CHANGED);
    await expect
      .poll(async () =>
        (await checkInRecords.weeksToComeOf(client.clientId))[0]?.getTime(),
      )
      .not.toBe(setUpFirstWeek!.getTime());
    const [changedFirstWeek] = await checkInRecords.weeksToComeOf(
      client.clientId,
    );

    // act
    await coachClient.openStopWeekly();
    await stopWeeklyDialog.confirm();

    // assert
    await stopWeeklyDialog.expectClosed();
    await coachClient.expectToast(STOPPED);
    await notificationBell.expectUnread(0);
    expect(await subjectsTo(client.email)).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await notificationBell.expectUnread(3);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRowsInOrder([STOPPED, CHANGED, SET_UP]);
    await notificationBell.expectRow(
      SET_UP,
      new RegExp(
        spacedPattern(`Every ${weeklyRuleOf(setUpFirstWeek!).slice(6)}.`),
      ),
    );
    await notificationBell.expectRow(
      CHANGED,
      new RegExp(spacedPattern(`Now ${weeklyRuleOf(changedFirstWeek!)}.`)),
    );
    await notificationBell.expectRow(
      STOPPED,
      `${COACH_DISPLAY_NAME} stopped your weekly check-in.`,
    );

    // act
    await notificationBell.openRow(
      STOPPED,
      `${COACH_DISPLAY_NAME} stopped your weekly check-in.`,
    );

    // assert
    await clientCheckIns.expectOpen();
    await notificationBell.expectUnread(2);
  },
);

test(
  "a request nobody answered before its time passed shows as expired once in both bells, as long ago as its time passed, and sends no email",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
    notificationBell,
    notificationRecords,
    page,
    provisionCoach,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await notificationRecords.clearCoachNotifications();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(UNANSWERED_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );

    // act
    await clientCheckIns.open();

    // assert
    await notificationBell.expectUnread(0);

    // arrange
    const passedAt = new Date(
      (Math.floor(Date.now() / HOUR_MS) - HOURS_SINCE_PASSED) * HOUR_MS,
    );
    await checkInRecords.moveStartTo(checkInId, passedAt);

    // act
    await clientCheckIns.open();

    // assert
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.open();

    // assert
    const clientLine = new RegExp(
      spacedPattern(
        `The check-in on ${shortDayOf(passedAt, BROWSER_TIME_ZONE)} at ${clockTimeOf(passedAt, BROWSER_TIME_ZONE)} was not answered in time.`,
      ),
    );
    await notificationBell.expectRow(EXPIRED, clientLine);
    await notificationBell.expectRowAge(EXPIRED, clientLine, THREE_HOURS_AGO);

    // act
    await clientCheckIns.open();
    await notificationBell.open();

    // assert
    await notificationBell.expectRowTitledOnce(EXPIRED);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachDashboard.open();

    // assert
    await notificationBell.expectUnread(2);

    // act
    await notificationBell.open();

    // assert
    const coachLine = new RegExp(
      spacedPattern(
        `${client.fullName}'s check-in on ${shortDayOf(passedAt, BROWSER_TIME_ZONE)} at ${clockTimeOf(passedAt, BROWSER_TIME_ZONE)} was not answered in time.`,
      ),
    );
    await notificationBell.expectRow(EXPIRED, coachLine);
    await notificationBell.expectRowAge(EXPIRED, coachLine, THREE_HOURS_AGO);

    // act
    await notificationBell.openRow(EXPIRED, coachLine);

    // assert
    await expect(page).toHaveURL(coachReviewUrlOf(checkInId));
    await coachCheckIns.expectReviewLandedOn("Past", client.fullName);
    expect(await subjectsTo(client.email)).toEqual([]);
    expect(await subjectsTo(COACH_NOTIFICATION_EMAIL)).not.toContainEqual(
      expect.stringMatching(/expired/i),
    );
  },
);

test(
  "a paid renewal whose new weeks clash with a closed day gives the coach one clash entry that opens the earliest clashing week, and no email",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    coachAvailability,
    coachCheckIns,
    coachClient,
    coachDashboard,
    coachSettings,
    notificationBell,
    notificationRecords,
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
    const weekly: WeeklyHour = {
      day: CLASHING_DAY,
      hour: CLASHING_HOUR,
      timeZone: COACH_TIME_ZONE,
    };
    const period = {
      from: daysAfter(client.paidAt, WITHDRAWAL_DAYS),
      until: paidThrough(client.paidAt),
    };
    const renewedThrough = paidThrough(period.until);
    const renewedWeeks = weeklyStartsBetween(weekly, {
      from: period.until,
      until: renewedThrough,
    });
    await page.goto("/store");
    await signInAsCoach();
    await coachDashboard.open();
    await notificationRecords.markCoachNotificationsRead();
    await coachClient.open(client.clientId);
    await coachClient.openWeeklyDialog();
    await weeklyCheckInDialog.chooseHour(hourLabelOf(CLASHING_HOUR));
    await weeklyCheckInDialog.save();
    await coachClient.expectToast(SET_UP);
    await coachSettings.open();
    await coachSettings.closeDay(CLASHING_DAY);
    await coachSettings.save();
    await coachDashboard.open();

    // assert
    await notificationBell.expectUnread(0);

    // act
    const renewal = await deliverSimulatedRenewalPaid({
      baseURL: E2E_APP_URL,
      subscriptionId: client.subscription.subscriptionId,
      periodEnd: renewedThrough,
    });
    await coachDashboard.open();

    // assert
    expect(renewal.status).toBe(OK);
    expect(renewedWeeks.length).toBeGreaterThan(1);
    await notificationBell.expectUnread(1);

    // act
    await notificationBell.open();

    // assert
    const clashLine = `${client.fullName}'s new weeks fall on a taken hour.`;
    await notificationBell.expectRow(
      `${renewedWeeks.length} weekly check-ins clash`,
      clashLine,
    );
    expect(await subjectsTo(COACH_NOTIFICATION_EMAIL)).not.toContainEqual(
      expect.stringMatching(/clash/i),
    );

    // act
    await notificationBell.openRow(
      `${renewedWeeks.length} weekly check-ins clash`,
      clashLine,
    );

    // assert
    const earliestId = await checkInRecords.idOf(
      client.clientId,
      renewedWeeks[0]!,
    );
    await expect(page).toHaveURL(coachReviewUrlOf(earliestId));
    await coachCheckIns.expectCheckInFocused("Requests", earliestId);
    await notificationBell.expectUnread(0);
  },
);

test(
  "check-ins cancelled because a client's coaching ended appear in neither bell",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    coachDashboard,
    notificationBell,
    notificationRecords,
    page,
    portalRequests,
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
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: COACHING_END_DAYS_SINCE_PAYMENT,
    });
    const coachingEndsAt = paidThrough(client.paidAt);
    await page.goto("/store");
    await signInAsCoach();
    const offered = await checkInRequests.openTimesFor(client.clientId);
    const [onEndTime, afterTime] = offered.filter(
      (time) => time.getTime() >= coachingEndsAt.getTime() + END_MARGIN_MS,
    );
    await checkInRequests.schedule(
      client.clientId,
      onEndTime!,
      COACHING_ENDS_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      afterTime!,
      AFTER_COACHING_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, onEndTime!),
    );
    await coachDashboard.open();
    await notificationRecords.markCoachNotificationsRead();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    const cancellation = await portalRequests.cancelSubscription();
    await clientCheckIns.open();

    // assert
    expect(cancellation.status).toBe(OK);
    await clientCheckIns.showTab("Past");
    await expect(
      clientCheckIns.checkIn("Past", COACHING_ENDS_NOTE),
    ).toContainText("Cancelled");
    await notificationBell.expectUnread(2);

    // act
    await notificationBell.open();

    // assert
    await notificationBell.expectRowCount(2);
    await notificationBell.expectNoRowTitled("Check-in cancelled");

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachDashboard.open();

    // assert
    await notificationBell.expectUnread(0);
  },
);
