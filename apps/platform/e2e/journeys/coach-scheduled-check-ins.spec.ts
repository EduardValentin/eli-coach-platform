import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";

import { emailMomentOf } from "../support/check-in-moments";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  acceptEmailsTo,
  COACH_NOTIFICATION_EMAIL,
  emailTo,
  latestSubjectTo,
  refuseEmailsTo,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const BOOKING_TIME_ZONE = "America/New_York";
const JOURNEY_TIMEOUT_MS = 240_000;
const SCHEDULED_SUBJECT = `${COACH_DISPLAY_NAME} scheduled a check-in with you`;
const CANCELLED_SUBJECT = `${COACH_DISPLAY_NAME} cancelled the check-in request`;
const FORM_CHECK_NOTE = "Let's look at your squat form together.";
const DECLINED_NOTE = "A quick look at your meal plan.";
const CANCELLED_NOTE = "Time to review your progress photos.";
const BLOCKED_NOTE = "Shall we talk this week?";
const OWN_NOTE = "Your first monthly check-in.";
const SECOND_NOTE = "Your second monthly check-in.";
const UNANSWERED_NOTE = "Nobody answered this one.";
const LATE_NOTE = "Answered too late.";
const KEYBOARD_NOTE = "Scheduled without a mouse.";
const CLIENT_OWN_NOTE = "Can we talk about my knee?";
const HELD_NOTE = "Let's plan your next block.";
const STALE_DECLINED_NOTE = "Declined on another screen.";
const STALE_APPROVED_NOTE = "Approved on another screen.";
const KEYBOARD_CANCELLED_NOTE = "Cancelled without a mouse.";
const KEYBOARD_APPROVED_NOTE = "Approved without a mouse.";
const UNSENT_CANCELLED_NOTE = "Cancelled while email is down.";
const UNSENT_APPROVED_NOTE = "Approved while email is down.";
const UNSENT_DECLINED_NOTE = "Declined while email is down.";
const TAKEN_NOTE = "This hour goes to someone else.";
const OK = 200;
const CANNOT_ANSWER = { error: "client_cannot_answer" };
const NOT_PENDING = { error: "not_pending" };
const WAITING_REFUSAL = { error: "request_waiting" };
const SCHEDULED = { status: "scheduled" };
const CREATED = 201;
const CONFLICT = 409;
const UNANSWERED_START_MINUTES = -60;
const LATE_START_MINUTES = -180;

test.use({ timezoneId: CLIENT_TIME_ZONE });

function coachJoinLinkOf(checkInId: string): string {
  return `${E2E_APP_URL}/coach/checkins/${checkInId}/join`;
}

test(
  "the coach schedules a check-in from a client's record, the client approves it, and both see it upcoming",
  { tag: "@critical" },
  async ({
    checkInRecords,
    checkInRequests,
    checkInScheduleDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    const latestOpenTime = (await checkInRequests.openTimes()).at(-1);
    await checkInRecords.holdHourFor(
      client.clientId,
      latestOpenTime!,
      CLIENT_TIME_ZONE,
    );
    await coachClient.open(client.clientId);

    // act
    await coachClient.openScheduleDialog();
    await checkInScheduleDialog.expectNoteFor(client.firstName);
    const scheduled = await checkInScheduleDialog.sendSoonest(FORM_CHECK_NOTE);

    // assert
    await expect(page.getByText(/^Check-in scheduled for /)).toBeVisible();
    const scheduledEmail = await emailTo(client.email, SCHEDULED_SUBJECT);
    expect(scheduledEmail.text).toContain(
      emailMomentOf(scheduled.startsAt, BOOKING_TIME_ZONE),
    );
    expect(scheduledEmail.text).toContain(FORM_CHECK_NOTE);
    expect(scheduledEmail.links).toContain(`${E2E_APP_URL}/client/checkins`);
    await coachCheckIns.open();
    await coachCheckIns.expectRequestedByYou(FORM_CHECK_NOTE);
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
    await clientCheckIns.expectWaitingCount(1);
    await clientCheckIns.expectRequestedByCoach(FORM_CHECK_NOTE);
    await clientCheckIns.expectInOrder("Requests", [
      FORM_CHECK_NOTE,
      "Requested by you",
    ]);

    // act
    await clientCheckIns.approve(FORM_CHECK_NOTE);

    // assert
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      scheduled.startsAt,
    );
    const approvalEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} approved the check-in`,
    );
    expect(approvalEmail.links).toContain(coachJoinLinkOf(checkInId));
    expect(approvalEmail.text).toContain(
      emailMomentOf(scheduled.startsAt, COACH_TIME_ZONE),
    );
    expect(approvalEmail.attachmentNames).toEqual(["invite.ics"]);
    await clientCheckIns.expectJoin(FORM_CHECK_NOTE, "quiet");
    expect(clientProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const upcomingProblems = collectPageProblems(page);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectJoin(FORM_CHECK_NOTE, "quiet");
    expect(upcomingProblems).toEqual([]);
  },
);

test(
  "the client declines one coach's request and the coach cancels the next, and each hour is offered again",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInRecords,
    checkInRequestDialog,
    checkInScheduleDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);
    await coachClient.openScheduleDialog();
    const declined = await checkInScheduleDialog.sendSoonest(DECLINED_NOTE);
    await coachClient.openScheduleDialog();
    const cancelled = await checkInScheduleDialog.sendSoonest(CANCELLED_NOTE);
    await coachCheckIns.open();

    // act
    await coachCheckIns.cancelRequest(CANCELLED_NOTE);

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", CANCELLED_NOTE)).toContainText(
      "Cancelled",
    );
    const cancellationEmail = await emailTo(client.email, CANCELLED_SUBJECT);
    expect(cancellationEmail.text).toContain(
      emailMomentOf(cancelled.startsAt, BOOKING_TIME_ZONE),
    );

    // act
    await coachClient.open(client.clientId);
    await coachClient.openScheduleDialog();

    // assert
    await checkInScheduleDialog.expectOffers(cancelled);

    // arrange
    await checkInScheduleDialog.closeWithEscape();
    await checkInScheduleDialog.expectClosed();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // assert
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", CANCELLED_NOTE)).toContainText(
      "Cancelled",
    );

    // act
    await clientCheckIns.decline(DECLINED_NOTE);

    // assert
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );
    const declineEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} declined the check-in`,
    );
    expect(declineEmail.text).toContain(
      emailMomentOf(declined.startsAt, COACH_TIME_ZONE),
    );

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(declined);
    await checkInRequestDialog.expectOffers(cancelled);

    // arrange
    await checkInRequestDialog.closeWithEscape();
    await checkInRequestDialog.expectClosed();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(declined.startsAt, CLIENT_TIME_ZONE);
    await bookingPage.expectHourOffered(cancelled.startsAt, CLIENT_TIME_ZONE);
  },
);

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test(
    "a client still onboarding shows Schedule check-in held back with its reason, a client whose coaching ended shows none, and scheduling for either is refused",
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
      expect((await portalRequests.cancelSubscription()).status).toBe(200);
      await page.goto("/");
      await publicNav.signOut();
      await page.goto("/store");
      await signInAsCoach();

      // act
      await coachClient.open(onboarding.clientId);

      // assert
      await coachClient.expectScheduleBlocked(onboarding.gender);
      await coachClient.expectScheduleReasonOnHover(onboarding.gender);
      await coachClient.expectScheduleReasonOnFocus(onboarding.gender);
      await coachClient.expectScheduleReasonOnTap(onboarding.gender);

      // act
      const [soonest] = await checkInRequests.openTimes();
      const onboardingAnswer = await checkInRequests.schedule(
        onboarding.clientId,
        soonest!,
        BLOCKED_NOTE,
      );

      // assert
      expect(onboardingAnswer).toEqual({
        status: CONFLICT,
        body: CANNOT_ANSWER,
      });

      // act
      await coachClient.open(ended.clientId);

      // assert
      await coachClient.expectNoScheduleAction();

      // act
      const endedAnswer = await checkInRequests.schedule(
        ended.clientId,
        soonest!,
        BLOCKED_NOTE,
      );

      // assert
      expect(endedAnswer).toEqual({ status: CONFLICT, body: CANNOT_ANSWER });
    },
  );
});

test(
  "the coach cannot answer her own request, the client cannot cancel it, and the coach's requests leave the client's own request limit alone",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    checkInScheduleDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
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
    await coachClient.open(client.clientId);
    await coachClient.openScheduleDialog();
    const first = await checkInScheduleDialog.sendSoonest(OWN_NOTE);
    const [nextOpenTime] = await checkInRequests.openTimes();

    // act
    const secondAnswer = await checkInRequests.schedule(
      client.clientId,
      nextOpenTime!,
      SECOND_NOTE,
    );

    // assert
    expect(secondAnswer.status).toBe(CREATED);
    expect(secondAnswer.body).toMatchObject(SCHEDULED);

    // act
    const firstId = await checkInRecords.idOf(client.clientId, first.startsAt);
    const ownAnswers = [
      await checkInRequests.approve(firstId),
      await checkInRequests.decline(firstId, {}),
    ];

    // assert
    expect(ownAnswers).toEqual([
      { status: CONFLICT, body: NOT_PENDING },
      { status: CONFLICT, body: NOT_PENDING },
    ]);
    await coachCheckIns.open();
    await coachCheckIns.expectRequestedByYou(OWN_NOTE);
    await coachCheckIns.expectRequestedByYou(SECOND_NOTE);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // act
    const withdrawal = await checkInRequests.withdraw(firstId);

    // assert
    expect(withdrawal).toEqual({ status: CONFLICT, body: NOT_PENDING });
    await clientCheckIns.expectWaitingCount(2);
    await clientCheckIns.expectAnswerOffered(OWN_NOTE);
    await clientCheckIns.expectRequestAllowed();

    // act
    const [ownTime, anotherTime] = await checkInRequests.openTimes();
    const ownRequests = [
      await checkInRequests.ask(ownTime!, CLIENT_TIME_ZONE),
      await checkInRequests.ask(anotherTime!, CLIENT_TIME_ZONE),
    ];

    // assert
    expect(ownRequests.map(({ status }) => status)).toEqual([
      CREATED,
      CONFLICT,
    ]);
    expect(ownRequests[1]?.body).toEqual(WAITING_REFUSAL);
  },
);

test(
  "a coach's request nobody answers moves to Past unannounced once it starts, and an answer that comes too late is refused",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
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
    await signInAsCoach();
    const [soonest, next] = await checkInRequests.openTimes();
    const scheduledAnswers = [
      await checkInRequests.schedule(
        client.clientId,
        soonest!,
        UNANSWERED_NOTE,
      ),
      await checkInRequests.schedule(client.clientId, next!, LATE_NOTE),
    ];
    expect(scheduledAnswers.map(({ status }) => status)).toEqual([
      CREATED,
      CREATED,
    ]);
    const unansweredId = await checkInRecords.idOf(client.clientId, soonest!);
    const lateId = await checkInRecords.idOf(client.clientId, next!);
    await checkInRecords.moveStart(unansweredId, UNANSWERED_START_MINUTES);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", UNANSWERED_NOTE)).toContainText(
      "Cancelled",
    );
    await coachCheckIns.expectRequestedByYou(LATE_NOTE);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectInOrder("Past", [UNANSWERED_NOTE]);
    await expect(clientCheckIns.checkIn("Past", UNANSWERED_NOTE)).toContainText(
      "Cancelled",
    );
    await clientCheckIns.expectInOrder("Requests", [LATE_NOTE]);
    expect(await latestSubjectTo(client.email)).toBe(SCHEDULED_SUBJECT);

    // arrange
    await checkInRecords.moveStart(lateId, LATE_START_MINUTES);

    // act
    await clientCheckIns.approveNoLongerWaiting(LATE_NOTE);

    // assert
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", LATE_NOTE)).toContainText(
      "Cancelled",
    );
    expect(await latestSubjectTo(client.email)).toBe(SCHEDULED_SUBJECT);
  },
);

test(
  "the coach schedules a check-in by keyboard alone, and focus returns to Schedule check-in",
  { tag: "@completeness" },
  async ({
    checkInScheduleDialog,
    coachAvailability,
    coachCheckIns,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.openScheduleDialogWithKeyboard();

    // assert
    await checkInScheduleDialog.expectOpen();

    // act
    await checkInScheduleDialog.closeWithEscape();

    // assert
    await checkInScheduleDialog.expectClosed();
    await coachClient.expectScheduleButtonFocused();

    // act
    await coachClient.openScheduleDialogWithKeyboard();
    await checkInScheduleDialog.sendSoonestByKeyboard(KEYBOARD_NOTE);

    // assert
    await expect(page.getByText(/^Check-in scheduled for /)).toBeVisible();
    await coachClient.expectScheduleButtonFocused();
    await coachCheckIns.open();
    await coachCheckIns.expectRequestedByYou(KEYBOARD_NOTE);
  },
);

test(
  "on a phone the client's record keeps its header actions in view, and Schedule check-in opens the picker as a sheet",
  { tag: "@completeness" },
  async ({
    checkInScheduleDialog,
    coachAvailability,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    await setPhoneViewport(page);

    // act
    await coachClient.open(client.clientId);

    // assert
    await coachClient.expectHeaderActionsInView();
    await expectNoHorizontalScroll(page);

    // act
    await coachClient.openScheduleDialog();

    // assert
    await checkInScheduleDialog.expectOpenAsSheet();
    await expectNoHorizontalScroll(page);
  },
);

function zonedEmailMomentOf(instant: Date, timeZone: string): string {
  return `${emailMomentOf(instant, timeZone)} — ${timeZone}`;
}

test(
  "the hour the coach schedules stays off both pickers and the booking page while it waits and once approved, and her request lists after the client's own",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInRecords,
    checkInRequestDialog,
    checkInRequests,
    checkInScheduleDialog,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachClient,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    await checkInRequestDialog.sendSoonest(CLIENT_OWN_NOTE);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.openScheduleDialog();
    const scheduled = await checkInScheduleDialog.sendSoonest(HELD_NOTE);

    // assert
    const scheduledEmail = await emailTo(client.email, SCHEDULED_SUBJECT);
    expect(scheduledEmail.text).toContain(
      zonedEmailMomentOf(scheduled.startsAt, BOOKING_TIME_ZONE),
    );
    await coachCheckIns.open();
    await coachCheckIns.expectWaitingOnYouBeforeYourOwn(
      CLIENT_OWN_NOTE,
      HELD_NOTE,
    );
    await coachClient.open(client.clientId);
    await coachClient.openScheduleDialog();
    await checkInScheduleDialog.expectNotOffered(scheduled);

    // arrange
    await checkInScheduleDialog.closeWithEscape();
    await checkInScheduleDialog.expectClosed();
    await page.goto("/");
    await publicNav.signOut();

    // assert
    await bookingPage.expectHourNotOffered(
      scheduled.startsAt,
      CLIENT_TIME_ZONE,
    );

    // arrange
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // assert
    expect(await checkInRequests.openTimes()).not.toContainEqual(
      scheduled.startsAt,
    );

    // act
    await clientCheckIns.approve(HELD_NOTE);

    // assert
    const approvalEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} approved the check-in`,
    );
    expect(approvalEmail.text).toContain(
      zonedEmailMomentOf(scheduled.startsAt, COACH_TIME_ZONE),
    );
    expect(await checkInRequests.openTimes()).not.toContainEqual(
      scheduled.startsAt,
    );
    await page.goto("/");
    await publicNav.signOut();
    await bookingPage.expectHourNotOffered(
      scheduled.startsAt,
      CLIENT_TIME_ZONE,
    );
  },
);

test(
  "an answer given on a page that is out of date is refused with a message, and the page then shows where the check-in stands",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
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
    await signInAsCoach();
    const [declinedTime, approvedTime] = await checkInRequests.openTimes();
    await checkInRequests.schedule(
      client.clientId,
      declinedTime!,
      STALE_DECLINED_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      approvedTime!,
      STALE_APPROVED_NOTE,
    );
    const declinedId = await checkInRecords.idOf(
      client.clientId,
      declinedTime!,
    );
    const approvedId = await checkInRecords.idOf(
      client.clientId,
      approvedTime!,
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.expectWaitingCount(2);
    expect(
      await checkInRequests.decline(declinedId, { timeZone: CLIENT_TIME_ZONE }),
    ).toMatchObject({ status: OK });

    // act
    await clientCheckIns.approveNoLongerWaiting(STALE_DECLINED_NOTE);

    // assert
    await clientCheckIns.expectInOrder("Requests", [STALE_APPROVED_NOTE]);
    await clientCheckIns.showTab("Past");
    await expect(
      clientCheckIns.checkIn("Past", STALE_DECLINED_NOTE),
    ).toContainText("Cancelled");
    const declineEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} declined the check-in`,
    );
    expect(declineEmail.text).toContain(
      zonedEmailMomentOf(declinedTime!, COACH_TIME_ZONE),
    );

    // arrange
    await clientCheckIns.showTab("Requests");
    expect(await checkInRequests.approve(approvedId)).toMatchObject({
      status: OK,
    });

    // act
    await clientCheckIns.declineNoLongerWaiting(STALE_APPROVED_NOTE);

    // assert
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.expectJoin(STALE_APPROVED_NOTE, "quiet");
  },
);

test(
  "the coach cancels her request and the client approves the coach's other one by keyboard alone",
  { tag: "@completeness" },
  async ({
    checkInRecords,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signInAsCoach();
    const [cancelledTime, approvedTime] = await checkInRequests.openTimes();
    await checkInRequests.schedule(
      client.clientId,
      cancelledTime!,
      KEYBOARD_CANCELLED_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      approvedTime!,
      KEYBOARD_APPROVED_NOTE,
    );
    await coachCheckIns.open();

    // act
    await coachCheckIns.cancelRequestByKeyboard(KEYBOARD_CANCELLED_NOTE);

    // assert
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", KEYBOARD_CANCELLED_NOTE),
    ).toContainText("Cancelled");
    const cancellationEmail = await emailTo(client.email, CANCELLED_SUBJECT);
    expect(cancellationEmail.text).toContain(
      zonedEmailMomentOf(cancelledTime!, BOOKING_TIME_ZONE),
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // act
    await clientCheckIns.approveByKeyboard(KEYBOARD_APPROVED_NOTE);

    // assert
    await clientCheckIns.expectJoin(KEYBOARD_APPROVED_NOTE, "quiet");
  },
);

test(
  "when the hour the coach picked is taken while she chooses, she is told so and schedules another",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    checkInScheduleDialog,
    coachAvailability,
    coachCheckIns,
    coachClient,
    page,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signInAsCoach();
    const [taken, next] = await checkInRequests.openTimes();
    await coachClient.open(client.clientId);
    await coachClient.openScheduleDialog();
    await checkInScheduleDialog.chooseSoonest(TAKEN_NOTE);
    await checkInRecords.holdHourFor(client.clientId, taken!, CLIENT_TIME_ZONE);

    // act
    await checkInScheduleDialog.send();

    // assert
    await checkInScheduleDialog.expectTimeTaken(TAKEN_NOTE);

    // act
    const scheduled = await checkInScheduleDialog.sendAnotherTime();

    // assert
    expect(scheduled.startsAt).toEqual(next);
    await expect(page.getByText(/^Check-in scheduled for /)).toBeVisible();
    await coachCheckIns.open();
    await coachCheckIns.expectRequestedByYou(TAKEN_NOTE);
  },
);

test.describe("while emails cannot be sent", () => {
  test.afterEach(async () => {
    await acceptEmailsTo(COACH_NOTIFICATION_EMAIL);
  });

  test(
    "the coach's requests, her cancellation and the client's answers all stand",
    { tag: "@completeness" },
    async ({
      checkInScheduleDialog,
      clientCheckIns,
      coachAvailability,
      coachCheckIns,
      coachClient,
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
      await refuseEmailsTo(client.email);
      await page.goto("/store");
      await signInAsCoach();
      await coachClient.open(client.clientId);

      // act
      for (const note of [
        UNSENT_CANCELLED_NOTE,
        UNSENT_APPROVED_NOTE,
        UNSENT_DECLINED_NOTE,
      ]) {
        await coachClient.openScheduleDialog();
        await checkInScheduleDialog.sendSoonest(note);
        await expect(
          page.getByText(/^Check-in scheduled for /).first(),
        ).toBeVisible();
      }
      await coachCheckIns.open();
      await coachCheckIns.cancelRequest(UNSENT_CANCELLED_NOTE);

      // assert
      await coachCheckIns.expectRequestedByYou(UNSENT_APPROVED_NOTE);
      await coachCheckIns.expectRequestedByYou(UNSENT_DECLINED_NOTE);
      await coachCheckIns.showTab("Past");
      await expect(
        coachCheckIns.checkIn("Past", UNSENT_CANCELLED_NOTE),
      ).toContainText("Cancelled");
      expect(await latestSubjectTo(client.email)).toBeNull();

      // arrange
      await refuseEmailsTo(COACH_NOTIFICATION_EMAIL);
      await page.goto("/");
      await publicNav.signOut();
      await page.goto("/store");
      await signIn();
      await clientCheckIns.open();

      // act
      await clientCheckIns.approve(UNSENT_APPROVED_NOTE);
      await clientCheckIns.decline(UNSENT_DECLINED_NOTE);

      // assert
      await clientCheckIns.expectEmpty("Requests", "No open requests");
      await clientCheckIns.expectJoin(UNSENT_APPROVED_NOTE, "quiet");
      await clientCheckIns.showTab("Past");
      await expect(
        clientCheckIns.checkIn("Past", UNSENT_DECLINED_NOTE),
      ).toContainText("Cancelled");
      await page.reload();
      await clientCheckIns.expectJoin(UNSENT_APPROVED_NOTE, "quiet");
    },
  );
});
