import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import {
  clockTimeOf,
  emailMomentOf,
  spacedPattern,
} from "../support/check-in-moments";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  COACH_NOTIFICATION_EMAIL,
  latestEmailTo,
  refuseEmailsTo,
  type CapturedEmail,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const FORM_CHECK_NOTE = "Can we go over my squat form?";
const WITHDRAWN_NOTE = "I would like to talk about my meal plan.";
const DECLINED_NOTE = "Could we look at my progress photos?";
const PRIVATE_NOTE = "A quick word about my knee.";
const APPROVED_SUBJECT = "Your check-in is approved";
const DECLINED_SUBJECT = `${COACH_DISPLAY_NAME} could not make your check-in time`;
const KEYBOARD_NOTE = "Asked without a mouse.";
const TAKEN_NOTE = "Can we talk about my training split?";
const FIRST_NOTE = "First check-in of the month.";
const SECOND_NOTE = "Second check-in of the month.";
const UNANSWERED_NOTE = "Nobody answered this one.";
const LATE_ANSWER_NOTE = "Answered twice.";
const CLIENT_TAB_LINKS = ["Dashboard", "Check-ins", "Profile"];
const CLIENT_SIDEBAR_LINKS = [
  "Dashboard",
  "Check-ins",
  "Profile",
  "Resources",
  "Settings",
];
const COACH_NAVIGATION_LINKS = [
  "Dashboard",
  "Clients",
  "Check-ins",
  "Assessment calls",
  "Settings",
];
const HOUR_MS = 60 * 60 * 1000;
const NOTICE_MS = 24 * HOUR_MS;
const DAY_MS = 24 * HOUR_MS;
const HORIZON_DAYS = 30;
const FIRST_OPEN_HOUR = 8;
const LAST_OPEN_HOUR = 19;
const ENDED_REFUSAL = { error: "ended" };
const WAITING_REFUSAL = { error: "request_waiting" };
const CREATED = 201;
const CONFLICT = 409;
const OK = 200;
const NO_OTHER_MEASUREMENTS = {
  system: "metric",
  photoConsent: "not-given",
  entries: [],
} as const;

test.use({ timezoneId: CLIENT_TIME_ZONE });

async function latestSubjectTo(address: string): Promise<string | null> {
  try {
    return (await latestEmailTo(address)).subject;
  } catch {
    return null;
  }
}

async function emailTo(
  address: string,
  subject: string,
): Promise<CapturedEmail> {
  await expect.poll(() => latestSubjectTo(address)).toBe(subject);

  return latestEmailTo(address);
}

function clientJoinLinkOf(checkInId: string): string {
  return `${E2E_APP_URL}/client/checkins/${checkInId}/join`;
}

function coachHourOf(instant: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: COACH_TIME_ZONE,
    }).format(instant),
  );
}

function coachDayNumberOf(instant: Date): number {
  const coachDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: COACH_TIME_ZONE,
  }).format(instant);

  return Date.parse(`${coachDate}T00:00:00Z`) / DAY_MS;
}

function shownTimeOf(instant: Date): RegExp {
  return new RegExp(spacedPattern(clockTimeOf(instant, CLIENT_TIME_ZONE)));
}

test(
  "a client asks for a check-in, her coach approves it, and both join it",
  { tag: "@critical" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
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
    await coachMeetingRoom.set();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);
    await clientCheckIns.open();

    // act
    await clientCheckIns.openRequestDialog();
    const requested =
      await checkInRequestDialog.requestSoonest(FORM_CHECK_NOTE);

    // assert
    await expect(page.getByText(/^Check-in requested for /)).toBeVisible();
    await clientCheckIns.showTab("Requests");
    await expect(
      clientCheckIns.checkIn("Requests", FORM_CHECK_NOTE),
    ).toContainText("Requested by you");
    const requestEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} asked for a check-in`,
    );
    expect(requestEmail.text).toContain(client.fullName);
    expect(requestEmail.text).toContain(
      emailMomentOf(requested.startsAt, COACH_TIME_ZONE),
    );
    expect(requestEmail.text).toContain(FORM_CHECK_NOTE);
    expect(clientProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    const waiting = await checkInRecords.waitingRequestCount();

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectTabShown("Requests");
    await coachCheckIns.expectWaitingCount(waiting);
    await expect(
      coachCheckIns.checkIn("Requests", client.fullName),
    ).toContainText(FORM_CHECK_NOTE);

    // act
    await coachCheckIns.approve(client.fullName);

    // assert
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );
    const approvalEmail = await emailTo(client.email, APPROVED_SUBJECT);
    expect(approvalEmail.links).toContain(clientJoinLinkOf(checkInId));
    expect(approvalEmail.text).toContain(
      emailMomentOf(requested.startsAt, CLIENT_TIME_ZONE),
    );
    expect(approvalEmail.attachmentNames).toEqual(["invite.ics"]);
    await coachCheckIns.showTab("Upcoming");
    await expect(
      coachCheckIns.checkIn("Upcoming", client.fullName),
    ).toContainText(FORM_CHECK_NOTE);

    // act
    await coachCheckIns.joinFromRow(client.fullName);

    // assert
    await coachMeetingRoom.expectEntered();
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const joiningProblems = collectPageProblems(page);

    // act
    await clientCheckIns.open();

    // assert
    await expect(
      clientCheckIns.checkIn("Upcoming", FORM_CHECK_NOTE),
    ).toBeVisible();

    // act
    await clientCheckIns.joinFromRow(FORM_CHECK_NOTE);

    // assert
    await coachMeetingRoom.expectEntered();
    await coachMeetingRoom.expectLinkLeadsHere(clientJoinLinkOf(checkInId));
    expect(joiningProblems).toEqual([]);
  },
);

test(
  "a client withdraws one request and her coach declines the next, and each hour is offered again",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
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
    await clientCheckIns.open();

    // act
    await clientCheckIns.openRequestDialog();
    const withdrawn = await checkInRequestDialog.requestSoonest(WITHDRAWN_NOTE);

    // assert
    await clientCheckIns.expectRequestBlocked();

    // act
    await clientCheckIns.withdraw(WITHDRAWN_NOTE);

    // assert
    await clientCheckIns.expectRequestAllowed();
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", WITHDRAWN_NOTE)).toContainText(
      "Cancelled",
    );
    const withdrawalEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} withdrew the check-in request`,
    );
    expect(withdrawalEmail.text).toContain(
      emailMomentOf(withdrawn.startsAt, COACH_TIME_ZONE),
    );

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(withdrawn);

    // arrange
    await checkInRequestDialog.closeWithEscape();
    await checkInRequestDialog.expectClosed();
    await clientCheckIns.openRequestDialog();
    const declined = await checkInRequestDialog.requestSoonest(DECLINED_NOTE);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();

    // act
    await coachCheckIns.decline(client.fullName);

    // assert
    await expect(
      coachCheckIns.checkIn("Requests", client.fullName),
    ).toBeHidden();
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );
    const declineEmail = await emailTo(client.email, DECLINED_SUBJECT);
    expect(declineEmail.text).toContain(
      emailMomentOf(declined.startsAt, CLIENT_TIME_ZONE),
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectRequestAllowed();
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(declined);
  },
);

test(
  "only the client and her coach reach a check-in, and a missing meeting link says so",
  { tag: "@completeness" },
  async ({
    accountPortal,
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
    page,
    provisionCoach,
    provisionOtherMeasuredClient,
    provisionSubmittedClient,
    publicNav,
    signIn,
    signInAsCoach,
    signInAsOtherClient,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await coachMeetingRoom.unset();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await provisionOtherMeasuredClient(NO_OTHER_MEASUREMENTS);
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.requestSoonest(PRIVATE_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );

    // act
    const pendingJoin = await clientCheckIns.openJoinLink(checkInId);

    // assert
    await clientCheckIns.expectNotFound(pendingJoin);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();
    await coachCheckIns.approve(client.fullName);

    // act
    await coachCheckIns.openJoinLink(checkInId);

    // assert
    await coachCheckIns.expectMeetingLinkNotSet();

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act
    await clientCheckIns.openJoinLink(checkInId);
    await accountPortal.signInWithEmail(client.email);
    await accountPortal.completeEmailOtp();

    // assert
    await clientCheckIns.expectJoinNotReady(checkInId);

    // act
    await clientCheckIns.returnFromNotReadyJoin();

    // assert
    await expect(
      clientCheckIns.checkIn("Upcoming", PRIVATE_NOTE),
    ).toBeVisible();

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsOtherClient();

    // act
    const otherClientJoin = await clientCheckIns.openJoinLink(checkInId);

    // assert
    await clientCheckIns.expectNotFound(otherClientJoin);
  },
);

test(
  "a client asks for a check-in from her phone",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    clientPortalShell,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");

    // act
    await setPhoneViewport(page);

    // assert
    await clientPortalShell.expectTabLinks(CLIENT_TAB_LINKS);

    // act
    await clientPortalShell.openCheckInsFromTabs();

    // assert
    await clientCheckIns.expectOpen();
    await clientCheckIns.expectFloatingRequestButton();
    await expectNoHorizontalScroll(page);

    // act
    await clientCheckIns.openRequestDialogWithKeyboard();

    // assert
    await checkInRequestDialog.expectOpen();
    await expectNoHorizontalScroll(page);

    // act
    await checkInRequestDialog.closeWithEscape();

    // assert
    await checkInRequestDialog.expectClosed();
    await clientCheckIns.expectRequestButtonFocused();
  },
);

test(
  "her portal and her coach's lead to Check-ins, each list starts empty, and the coach's Settings say they cover check-ins",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    clientPortalShell,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
    coachSettings,
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
    await coachMeetingRoom.unset();
    await provisionCoach();
    await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await page.goto("/client");

    // assert
    await clientPortalShell.expectSidebarLinks(CLIENT_SIDEBAR_LINKS);

    // act
    await clientPortalShell.openCheckInsFromSidebar();

    // assert
    await clientCheckIns.expectOpen();
    await clientCheckIns.expectEmpty("Upcoming", "No upcoming check-ins");
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.expectEmpty("Past", "No past check-ins yet");

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectDayUnavailable(
      new Date(),
      CLIENT_TIME_ZONE,
    );

    // arrange
    await checkInRequestDialog.closeWithEscape();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await page.goto("/coach");

    // assert
    await coachCheckIns.expectNavigationLinks(COACH_NAVIGATION_LINKS);

    // act
    await coachCheckIns.openFromNavigation();

    // assert
    await coachCheckIns.expectTabShown("Requests");

    // act
    await coachSettings.open();

    // assert
    await coachSettings.expectAvailabilityCoversCheckIns();
    await coachSettings.expectNoMeetingLinkWarning();
  },
);

test(
  "only open hours are offered, an hour taken while she chooses is refused, and a held hour leaves the booking page",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInRecords,
    checkInRequestDialog,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    page,
    provisionCoach,
    provisionOtherMeasuredClient,
    provisionSubmittedClient,
    publicNav,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    await provisionSubmittedClient("waiting");
    const other = await provisionOtherMeasuredClient(NO_OTHER_MEASUREMENTS);
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // act
    const askedAt = Date.now();
    const offered = await checkInRequests.openTimes();

    // assert
    expect(offered.length).toBeGreaterThan(0);
    for (const time of offered) {
      expect(time.getTime() - askedAt).toBeGreaterThanOrEqual(NOTICE_MS);
      expect(
        coachDayNumberOf(time) - coachDayNumberOf(new Date(askedAt)),
      ).toBeLessThanOrEqual(HORIZON_DAYS);
      expect(time.getUTCMinutes()).toBe(0);
      expect(coachHourOf(time)).toBeGreaterThanOrEqual(FIRST_OPEN_HOUR);
      expect(coachHourOf(time)).toBeLessThanOrEqual(LAST_OPEN_HOUR);
    }
    const [taken, next] = offered;

    // arrange
    await clientCheckIns.openRequestDialog();
    await checkInRequestDialog.chooseSoonest(TAKEN_NOTE);
    await checkInRecords.holdHourFor(other.clientId, taken!, CLIENT_TIME_ZONE);

    // act
    await checkInRequestDialog.send();

    // assert
    await checkInRequestDialog.expectTimeTaken(TAKEN_NOTE);

    // act
    const requested = await checkInRequestDialog.requestAnotherTime();

    // assert
    expect(requested.startsAt).toEqual(next);
    await clientCheckIns.showTab("Requests");
    await expect(clientCheckIns.checkIn("Requests", TAKEN_NOTE)).toBeVisible();
    const offeredAfter = (await checkInRequests.openTimes()).map((time) =>
      time.getTime(),
    );
    expect(offeredAfter).not.toContain(taken!.getTime());
    expect(offeredAfter).not.toContain(next!.getTime());

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourNotOffered(
      requested.startsAt,
      CLIENT_TIME_ZONE,
    );
  },
);

test(
  "a request nobody answers and a check-in that is over move to Past, Join Meet stands out near the start, and a late answer is refused",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequestDialog,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachMeetingRoom,
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
    await coachMeetingRoom.set();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const first = await checkInRequestDialog.requestSoonest(FIRST_NOTE);
    const firstId = await checkInRecords.idOf(client.clientId, first.startsAt);
    await checkInRecords.markApproved(firstId);
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const second = await checkInRequestDialog.requestSoonest(SECOND_NOTE);
    const secondId = await checkInRecords.idOf(
      client.clientId,
      second.startsAt,
    );
    await checkInRecords.markApproved(secondId);
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const unanswered =
      await checkInRequestDialog.requestSoonest(UNANSWERED_NOTE);
    const unansweredId = await checkInRecords.idOf(
      client.clientId,
      unanswered.startsAt,
    );

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectInOrder("Upcoming", [FIRST_NOTE, SECOND_NOTE]);
    await expect(clientCheckIns.checkIn("Upcoming", FIRST_NOTE)).toContainText(
      shownTimeOf(first.startsAt),
    );
    await clientCheckIns.expectJoin(FIRST_NOTE, "quiet");
    await clientCheckIns.expectInOrder("Requests", [UNANSWERED_NOTE]);

    // arrange
    await checkInRecords.moveStart(firstId, -180);
    await checkInRecords.moveStart(unansweredId, -60);
    await checkInRecords.moveStart(secondId, 5);

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectInOrder("Upcoming", [SECOND_NOTE]);
    await clientCheckIns.expectJoin(SECOND_NOTE, "emphasised");
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.expectInOrder("Past", [UNANSWERED_NOTE, FIRST_NOTE]);
    await expect(clientCheckIns.checkIn("Past", UNANSWERED_NOTE)).toContainText(
      "Cancelled",
    );
    await expect(clientCheckIns.checkIn("Past", FIRST_NOTE)).not.toContainText(
      "Cancelled",
    );
    await clientCheckIns.expectRequestAllowed();
    expect(await latestSubjectTo(client.email)).toBeNull();

    // act
    const overJoin = await clientCheckIns.openJoinLink(firstId);

    // assert
    await clientCheckIns.expectNotFound(overJoin);

    // arrange
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const answeredTwice =
      await checkInRequestDialog.requestSoonest(LATE_ANSWER_NOTE);
    const answeredTwiceId = await checkInRecords.idOf(
      client.clientId,
      answeredTwice.startsAt,
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", UNANSWERED_NOTE)).toContainText(
      "Cancelled",
    );
    await expect(coachCheckIns.checkIn("Past", FIRST_NOTE)).toBeVisible();
    await coachCheckIns.expectJoin(SECOND_NOTE, "emphasised");

    // arrange
    await refuseEmailsTo(client.email);
    await coachCheckIns.showTab("Requests");
    const elsewhere = await checkInRequests.approve(answeredTwiceId);

    // assert
    expect(elsewhere.status).toBe(OK);

    // act
    await coachCheckIns.declineAnsweredElsewhere(client.fullName);

    // assert
    await expect(
      coachCheckIns.checkIn("Requests", client.fullName),
    ).toBeHidden();
    await coachCheckIns.showTab("Upcoming");
    await expect(
      coachCheckIns.checkIn("Upcoming", LATE_ANSWER_NOTE),
    ).toBeVisible();
  },
);

test(
  "two requests sent at once leave one, and a client whose coaching has ended cannot ask for a check-in",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    clientEnded,
    coachAvailability,
    page,
    portalRequests,
    provisionSubscribedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    const client = await provisionSubscribedClient({
      start: "waiting",
      daysSincePayment: 3,
    });
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    const [soonest, next] = await checkInRequests.openTimes();

    // act
    const answers = await Promise.all([
      checkInRequests.ask(soonest!, CLIENT_TIME_ZONE),
      checkInRequests.ask(next!, CLIENT_TIME_ZONE),
    ]);

    // assert
    expect(answers.map(({ status }) => status).sort((a, b) => a - b)).toEqual([
      CREATED,
      CONFLICT,
    ]);
    expect(answers.map(({ body }) => body)).toContainEqual(WAITING_REFUSAL);
    expect(await checkInRecords.countOf(client.clientId)).toBe(1);

    // arrange
    await portalRequests.cancelSubscription();

    // act
    const answer = await checkInRequests.ask(soonest!, CLIENT_TIME_ZONE);

    // assert
    expect(answer).toEqual({ status: CONFLICT, body: ENDED_REFUSAL });

    // act
    await clientCheckIns.visit();

    // assert
    await clientEnded.expectOpen();
  },
);

test(
  "a client asks for a check-in and cancels it by keyboard alone",
  { tag: "@completeness" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialogWithKeyboard();
    await checkInRequestDialog.closeWithEscape();
    await clientCheckIns.expectRequestButtonFocused();
    await clientCheckIns.openRequestDialogWithKeyboard();

    // act
    await checkInRequestDialog.requestSoonestByKeyboard(KEYBOARD_NOTE);

    // assert
    await clientCheckIns.expectRequestBlocked();
    await clientCheckIns.showTab("Requests");
    await expect(
      clientCheckIns.checkIn("Requests", KEYBOARD_NOTE),
    ).toBeVisible();

    // act
    await clientCheckIns.withdrawByKeyboard(KEYBOARD_NOTE);

    // assert
    await clientCheckIns.expectRequestAllowed();
  },
);
