import { COACH_DISPLAY_NAME } from "~/shared/brand";

import {
  clockTimeOf,
  emailMomentOf,
  shortDayOf,
} from "../support/check-in-moments";
import type { PickedCheckIn } from "../support/check-in-picker-dialog";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { E2E_APP_URL } from "../support/e2e-app";
import {
  COACH_NOTIFICATION_EMAIL,
  emailTo,
  latestSubjectTo,
} from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import {
  expectNoHorizontalScroll,
  setPhoneViewport,
} from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const BOOKING_TIME_ZONE = "America/New_York";
const JOURNEY_TIMEOUT_MS = 300_000;
const NEW_TIME_PROPOSED = "New time proposed";
const COACH_PROPOSED_SUBJECT = `${COACH_DISPLAY_NAME} proposed a new time for your check-in`;
const COACH_ACCEPTED_SUBJECT = `${COACH_DISPLAY_NAME} accepted the new time`;
const COACH_DECLINED_SUBJECT = `${COACH_DISPLAY_NAME} declined the new time`;
const COACH_CANCELLED_SUBJECT = `${COACH_DISPLAY_NAME} cancelled the check-in`;
const HOUR_FREED = "That hour is free again.";
const ORIGINAL_NOTE = "Our usual monthly review.";
const COACH_NOTE = "Could we meet a little earlier?";
const CLIENT_NOTE = "That clashes with work, how about this one?";
const REQUEST_NOTE = "Can we go over my deadlift?";
const DECLINED_NOTE = "Could we push this back a day?";
const MOVED_NOTE = "This one has moved twice already.";
const WAITING_NOTE = "Let's look at your food diary.";
const OWN_NOTE = "I'd rather meet at this time.";
const THIRD_NOTE = "One more move, please.";
const KEPT_NOTE = "A chat about my sleep.";
const TAKEN_NOTE = "This hour goes to someone else.";
const CLIENT_CANCELLED_NOTE = "A question about my rest days.";
const COACH_CANCELLED_NOTE = "A word about my mobility work.";
const UNANSWERED_NOTE = "Nobody answered this new time.";
const LATE_NOTE = "This new time was answered too late.";
const KEYBOARD_NOTE = "Moved without a mouse.";
const KEYBOARD_NEW_NOTE = "Proposed by keyboard alone.";
const PHONE_NOTE = "Moved from my phone.";
const CLIENT_REQUEST_NOTE = "Could we talk about my squat depth?";
const COACH_REQUEST_NOTE = "Let's plan your next block.";
const COACH_COUNTER_NOTE = "That hour is gone, how about this one?";
const CLIENT_COUNTER_NOTE = "I work then, could we meet at this time?";
const ANSWERED_ELSEWHERE_NOTE = "This new time was answered elsewhere.";
const CANCELLED_ELSEWHERE_NOTE = "This new time was cancelled elsewhere.";
const KEYBOARD_MOVED_NOTE = "A review moved by the coach's keyboard.";
const KEYBOARD_COACH_NOTE = "Proposed with the keyboard only.";
const KEYBOARD_CANCELLED_NOTE = "A review cancelled by the coach's keyboard.";
const OK = 200;
const CONFLICT = 409;
const MOVES_EXHAUSTED = { error: "moves_exhausted" };
const NOT_PENDING = { error: "not_pending" };
const UNANSWERED_START_MINUTES = -60;
const LATE_START_MINUTES = -180;

test.use({ timezoneId: CLIENT_TIME_ZONE });

function shownIn(startsAt: Date): PickedCheckIn {
  return { startsAt, timeZone: CLIENT_TIME_ZONE };
}

function dayAndTimeOf(startsAt: Date): string {
  return `${shortDayOf(startsAt, CLIENT_TIME_ZONE)} at ${clockTimeOf(startsAt, CLIENT_TIME_ZONE)}`;
}

test(
  "the coach proposes a new time, the client proposes another, the coach accepts it, and both earlier hours are offered again",
  { tag: "@critical" },
  async ({
    bookingPage,
    checkInProposeDialog,
    checkInRecords,
    checkInRequestDialog,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    const [soonest, next, originalTime] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      originalTime!,
      ORIGINAL_NOTE,
    );
    const checkInId = await checkInRecords.idOf(client.clientId, originalTime!);
    await checkInRecords.markApproved(checkInId);
    const original = shownIn(originalTime!);
    await coachCheckIns.open();

    // act
    await coachCheckIns.reschedule("Upcoming", ORIGINAL_NOTE);

    // assert
    await checkInProposeDialog.expectOpen();
    await checkInProposeDialog.expectCurrentTime(original);
    await checkInProposeDialog.expectNoteFor(client.firstName);

    // act
    const coachTime = await checkInProposeDialog.sendSoonest(COACH_NOTE);

    // assert
    expect(coachTime.startsAt).toEqual(soonest);
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    const proposalEmail = await emailTo(client.email, COACH_PROPOSED_SUBJECT);
    expect(proposalEmail.text).toContain(
      emailMomentOf(originalTime!, BOOKING_TIME_ZONE),
    );
    expect(proposalEmail.text).toContain(
      emailMomentOf(coachTime.startsAt, BOOKING_TIME_ZONE),
    );
    expect(proposalEmail.text).toContain(COACH_NOTE);
    expect(proposalEmail.links).toContain(`${E2E_APP_URL}/client/checkins`);
    await coachCheckIns.expectOwnNewTime(COACH_NOTE);
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
    await clientCheckIns.expectNewTimeFromCoach(COACH_NOTE);
    await clientCheckIns.expectEarlierTimeStruck(COACH_NOTE, original);

    // act
    await clientCheckIns.reschedule("Requests", COACH_NOTE);

    // assert
    await checkInProposeDialog.expectCurrentTime(coachTime);
    await checkInProposeDialog.expectNoteFor("your coach");

    // act
    const clientTime = await checkInProposeDialog.sendSoonest(CLIENT_NOTE);

    // assert
    expect(clientTime.startsAt).toEqual(next);
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    const counterEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} proposed a new time for your check-in`,
    );
    expect(counterEmail.text).toContain(
      emailMomentOf(coachTime.startsAt, COACH_TIME_ZONE),
    );
    expect(counterEmail.text).toContain(
      emailMomentOf(clientTime.startsAt, COACH_TIME_ZONE),
    );
    expect(counterEmail.text).toContain(CLIENT_NOTE);
    await clientCheckIns.expectOwnNewTime(CLIENT_NOTE);
    expect(clientProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const acceptingProblems = collectPageProblems(page);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectNewTimeFromClient(CLIENT_NOTE, client.firstName);
    await coachCheckIns.expectEarlierTimeStruck(CLIENT_NOTE, coachTime);

    // act
    await coachCheckIns.accept(client.fullName);

    // assert
    const acceptedEmail = await emailTo(client.email, COACH_ACCEPTED_SUBJECT);
    expect(acceptedEmail.text).toContain(
      emailMomentOf(clientTime.startsAt, CLIENT_TIME_ZONE),
    );
    expect(acceptedEmail.attachmentNames).toEqual(["invite.ics"]);
    await coachCheckIns.expectUpcomingAt(CLIENT_NOTE, clientTime);
    await coachCheckIns.expectRescheduledFrom(CLIENT_NOTE, coachTime);
    const coachOffers = await checkInRequests.openTimesFor(client.clientId);
    expect(coachOffers).toContainEqual(originalTime);
    expect(coachOffers).toContainEqual(coachTime.startsAt);
    expect(coachOffers).not.toContainEqual(clientTime.startsAt);
    expect(acceptingProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(originalTime!, CLIENT_TIME_ZONE);
    await bookingPage.expectHourOffered(coachTime.startsAt, CLIENT_TIME_ZONE);
    await bookingPage.expectHourNotOffered(
      clientTime.startsAt,
      CLIENT_TIME_ZONE,
    );

    // arrange
    await page.goto("/store");
    await signIn();
    const upcomingProblems = collectPageProblems(page);

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectUpcomingAt(CLIENT_NOTE, clientTime);
    await clientCheckIns.expectRescheduledFrom(CLIENT_NOTE, coachTime);

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectOffers(original);
    await checkInRequestDialog.expectOffers(coachTime);
    await checkInRequestDialog.expectNotOffered(clientTime);
    expect(upcomingProblems).toEqual([]);
  },
);

test(
  "the client proposes a new time, the coach declines it, and the check-in is cancelled on both pages with both hours offered again",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInProposeDialog,
    checkInRecords,
    checkInRequestDialog,
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
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(REQUEST_NOTE);
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, requested.startsAt),
    );
    await clientCheckIns.open();

    // act
    await clientCheckIns.reschedule("Upcoming", REQUEST_NOTE);
    const proposed = await checkInProposeDialog.sendSoonest(DECLINED_NOTE);

    // assert
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    await clientCheckIns.expectOwnNewTime(DECLINED_NOTE);
    await clientCheckIns.expectEarlierTimeStruck(DECLINED_NOTE, requested);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();

    // act
    await coachCheckIns.decline(client.fullName);

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );
    const declineEmail = await emailTo(client.email, COACH_DECLINED_SUBJECT);
    expect(declineEmail.text).toContain(
      emailMomentOf(proposed.startsAt, CLIENT_TIME_ZONE),
    );
    expect(declineEmail.text).toContain(HOUR_FREED);
    const coachOffers = await checkInRequests.openTimesFor(client.clientId);
    expect(coachOffers).toContainEqual(requested.startsAt);
    expect(coachOffers).toContainEqual(proposed.startsAt);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(requested.startsAt, CLIENT_TIME_ZONE);
    await bookingPage.expectHourOffered(proposed.startsAt, CLIENT_TIME_ZONE);

    // arrange
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectEmpty("Upcoming", "No upcoming check-ins");
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", DECLINED_NOTE)).toContainText(
      "Cancelled",
    );
  },
);

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test(
    "after two moves Reschedule is held back with its reason on both pages and a third new time is refused, the client cannot cancel the check-in the coach asked for, and a proposer cannot take back her new time",
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
      const [movedTime, waitingTime, newTime] =
        await checkInRequests.openTimesFor(client.clientId);
      await checkInRequests.schedule(client.clientId, movedTime!, MOVED_NOTE);
      await checkInRequests.schedule(
        client.clientId,
        waitingTime!,
        WAITING_NOTE,
      );
      const movedId = await checkInRecords.idOf(client.clientId, movedTime!);
      const waitingId = await checkInRecords.idOf(
        client.clientId,
        waitingTime!,
      );
      await checkInRecords.markApproved(movedId);
      await checkInRecords.markMoved(movedId, 2);
      await checkInRecords.markApproved(waitingId);

      // act
      await coachCheckIns.open();

      // assert
      await coachCheckIns.expectRescheduleBlocked("Upcoming", MOVED_NOTE);
      await coachCheckIns.expectRescheduleReasonOnHover("Upcoming", MOVED_NOTE);
      await coachCheckIns.expectRescheduleReasonOnFocus("Upcoming", MOVED_NOTE);
      await coachCheckIns.expectRescheduleReasonOnTap("Upcoming", MOVED_NOTE);

      // act
      const coachAnswer = await checkInRequests.proposeNewTime(movedId, {
        startsAt: newTime!,
        note: THIRD_NOTE,
      });

      // assert
      expect(coachAnswer).toEqual({ status: CONFLICT, body: MOVES_EXHAUSTED });
      expect(await checkInRecords.movesOf(movedId)).toBe(2);

      // arrange
      await page.goto("/");
      await publicNav.signOut();
      await page.goto("/store");
      await signIn();

      // act
      await clientCheckIns.open();

      // assert
      await clientCheckIns.expectRescheduleBlocked("Upcoming", MOVED_NOTE);
      await clientCheckIns.expectRescheduleReasonOnHover(
        "Upcoming",
        MOVED_NOTE,
      );
      await clientCheckIns.expectRescheduleReasonOnFocus(
        "Upcoming",
        MOVED_NOTE,
      );
      await clientCheckIns.expectRescheduleReasonOnTap("Upcoming", MOVED_NOTE);
      await clientCheckIns.expectNoCancel("Upcoming", MOVED_NOTE);

      // act
      const clientAnswer = await checkInRequests.proposeNewTime(movedId, {
        startsAt: newTime!,
        timeZone: CLIENT_TIME_ZONE,
      });

      // assert
      expect(clientAnswer).toEqual({ status: CONFLICT, body: MOVES_EXHAUSTED });

      // arrange
      const ownProposal = await checkInRequests.proposeNewTime(waitingId, {
        startsAt: newTime!,
        note: OWN_NOTE,
        timeZone: CLIENT_TIME_ZONE,
      });
      await clientCheckIns.open();

      // assert
      expect(ownProposal.status).toBe(OK);
      await clientCheckIns.expectOwnNewTime(OWN_NOTE);

      // act
      const withdrawal = await checkInRequests.withdraw(waitingId);

      // assert
      expect(withdrawal).toEqual({ status: CONFLICT, body: NOT_PENDING });
      await clientCheckIns.open();
      await clientCheckIns.expectOwnNewTime(OWN_NOTE);
    },
  );
});

test(
  "when the hour picked for a new time is taken while she chooses, she is told so and the check-in keeps its time",
  { tag: "@completeness" },
  async ({
    checkInProposeDialog,
    checkInRecords,
    checkInRequestDialog,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(KEPT_NOTE);
    const checkInId = await checkInRecords.idOf(
      client.clientId,
      requested.startsAt,
    );
    await checkInRecords.markApproved(checkInId);
    await clientCheckIns.open();
    await clientCheckIns.reschedule("Upcoming", KEPT_NOTE);
    const [taken] = await checkInRequests.openTimes();
    await checkInProposeDialog.chooseSoonest(TAKEN_NOTE);
    await checkInRecords.holdHourFor(client.clientId, taken!, CLIENT_TIME_ZONE);

    // act
    await checkInProposeDialog.send();

    // assert
    await checkInProposeDialog.expectTimeTaken(TAKEN_NOTE);
    expect(await checkInRecords.movesOf(checkInId)).toBe(0);

    // act
    await checkInProposeDialog.closeWithEscape();

    // assert
    await checkInProposeDialog.expectClosed();
    await clientCheckIns.expectUpcomingAt(KEPT_NOTE, requested);
    expect(await checkInRecords.earlierStartOf(checkInId)).toBeNull();
  },
);

test(
  "each side may cancel only the approved check-in it asked for, the client cancels hers after keeping it once, the coach cancels the coach's, and each side is told and each hour offered again",
  { tag: "@completeness" },
  async ({
    bookingPage,
    cancelCheckInDialog,
    checkInRecords,
    checkInRequestDialog,
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
    await checkInRecords.moveBookingZone(client.clientId, BOOKING_TIME_ZONE);
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const clientCancelled = await checkInRequestDialog.sendSoonest(
      CLIENT_CANCELLED_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, clientCancelled.startsAt),
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const [coachCancelled] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      coachCancelled!,
      COACH_CANCELLED_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, coachCancelled!),
    );

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectNoCancel("Upcoming", CLIENT_CANCELLED_NOTE);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectNoCancel("Upcoming", COACH_CANCELLED_NOTE);

    // act
    await clientCheckIns.cancel("Upcoming", CLIENT_CANCELLED_NOTE);

    // assert
    await cancelCheckInDialog.expectOpen(
      `${dayAndTimeOf(clientCancelled.startsAt)}.`,
    );

    // act
    await cancelCheckInDialog.dismiss();

    // assert
    await clientCheckIns.expectRowMenuFocused(
      "Upcoming",
      CLIENT_CANCELLED_NOTE,
    );

    // act
    await clientCheckIns.cancel("Upcoming", CLIENT_CANCELLED_NOTE);
    await cancelCheckInDialog.confirm();

    // assert
    await clientCheckIns.expectCancelledToast();
    await clientCheckIns.expectInOrder("Upcoming", [COACH_CANCELLED_NOTE]);
    await clientCheckIns.showTab("Past");
    await expect(
      clientCheckIns.checkIn("Past", CLIENT_CANCELLED_NOTE),
    ).toContainText("Cancelled");
    const clientCancellationEmail = await emailTo(
      COACH_NOTIFICATION_EMAIL,
      `${client.fullName} cancelled the check-in`,
    );
    expect(clientCancellationEmail.text).toContain(
      emailMomentOf(clientCancelled.startsAt, COACH_TIME_ZONE),
    );
    expect(await checkInRequests.openTimes()).toContainEqual(
      clientCancelled.startsAt,
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", CLIENT_CANCELLED_NOTE),
    ).toContainText("Cancelled");

    // act
    await coachCheckIns.cancel("Upcoming", COACH_CANCELLED_NOTE);

    // assert
    await cancelCheckInDialog.expectOpen(
      `${dayAndTimeOf(coachCancelled!)} with ${client.fullName}.`,
    );

    // act
    await cancelCheckInDialog.confirm();

    // assert
    await coachCheckIns.expectCancelledToast(client.fullName);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", COACH_CANCELLED_NOTE),
    ).toContainText("Cancelled");
    const coachCancellationEmail = await emailTo(
      client.email,
      COACH_CANCELLED_SUBJECT,
    );
    expect(coachCancellationEmail.text).toContain(
      emailMomentOf(coachCancelled!, BOOKING_TIME_ZONE),
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(
      clientCancelled.startsAt,
      CLIENT_TIME_ZONE,
    );
    await bookingPage.expectHourOffered(coachCancelled!, CLIENT_TIME_ZONE);

    // arrange
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectEmpty("Upcoming", "No upcoming check-ins");
    await clientCheckIns.showTab("Past");
    await expect(
      clientCheckIns.checkIn("Past", COACH_CANCELLED_NOTE),
    ).toContainText("Cancelled");
  },
);

test(
  "a new time nobody answers moves to Past unannounced once it starts, and an Accept that comes too late is refused",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
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
    const [unansweredTime, lateTime, unansweredNewTime, lateNewTime] =
      await checkInRequests.openTimesFor(client.clientId);
    await checkInRequests.schedule(
      client.clientId,
      unansweredTime!,
      ORIGINAL_NOTE,
    );
    await checkInRequests.schedule(client.clientId, lateTime!, ORIGINAL_NOTE);
    const unansweredId = await checkInRecords.idOf(
      client.clientId,
      unansweredTime!,
    );
    const lateId = await checkInRecords.idOf(client.clientId, lateTime!);
    await checkInRecords.markApproved(unansweredId);
    await checkInRecords.markApproved(lateId);
    await checkInRequests.proposeNewTime(unansweredId, {
      startsAt: unansweredNewTime!,
      note: UNANSWERED_NOTE,
    });
    await checkInRequests.proposeNewTime(lateId, {
      startsAt: lateNewTime!,
      note: LATE_NOTE,
    });
    await checkInRecords.moveStart(unansweredId, UNANSWERED_START_MINUTES);
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
    expect(await latestSubjectTo(client.email)).toBe(COACH_PROPOSED_SUBJECT);

    // arrange
    await checkInRecords.moveStart(lateId, LATE_START_MINUTES);

    // act
    await clientCheckIns.acceptNoLongerWaiting(LATE_NOTE);

    // assert
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", LATE_NOTE)).toContainText(
      "Cancelled",
    );
    expect(await latestSubjectTo(client.email)).toBe(COACH_PROPOSED_SUBJECT);
  },
);

test(
  "the client proposes a new time by keyboard alone, and Escape from the picker returns focus to the row's menu",
  { tag: "@completeness" },
  async ({
    checkInProposeDialog,
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(KEYBOARD_NOTE);
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, requested.startsAt),
    );
    await clientCheckIns.open();
    await clientCheckIns.showTab("Upcoming");

    // act
    await clientCheckIns.rescheduleByKeyboard("Upcoming", KEYBOARD_NOTE);

    // assert
    await checkInProposeDialog.expectOpen();

    // act
    await checkInProposeDialog.closeWithEscape();

    // assert
    await checkInProposeDialog.expectClosed();
    await clientCheckIns.expectRowMenuFocused("Upcoming", KEYBOARD_NOTE);

    // act
    await clientCheckIns.rescheduleByKeyboard("Upcoming", KEYBOARD_NOTE);
    await checkInProposeDialog.sendSoonestByKeyboard(KEYBOARD_NEW_NOTE);

    // assert
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    await clientCheckIns.expectOwnNewTime(KEYBOARD_NEW_NOTE);
  },
);

test(
  "on a phone the new-time picker opens as a sheet and the cancel confirmation fits the screen",
  { tag: "@completeness" },
  async ({
    cancelCheckInDialog,
    checkInProposeDialog,
    checkInRecords,
    checkInRequestDialog,
    clientCheckIns,
    coachAvailability,
    page,
    provisionSubmittedClient,
    signIn,
  }) => {
    // arrange
    await coachAvailability.openEveryDay();
    const client = await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested = await checkInRequestDialog.sendSoonest(PHONE_NOTE);
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, requested.startsAt),
    );
    await setPhoneViewport(page);
    await clientCheckIns.open();

    // act
    await clientCheckIns.reschedule("Upcoming", PHONE_NOTE);

    // assert
    await checkInProposeDialog.expectOpenAsSheet();
    await expectNoHorizontalScroll(page);

    // arrange
    await checkInProposeDialog.closeWithEscape();
    await checkInProposeDialog.expectClosed();

    // act
    await clientCheckIns.cancel("Upcoming", PHONE_NOTE);

    // assert
    await cancelCheckInDialog.expectOpen(
      `${dayAndTimeOf(requested.startsAt)}.`,
    );
    await cancelCheckInDialog.expectWithinViewport();
    await expectNoHorizontalScroll(page);
  },
);

test(
  "each side proposes a new time for a request awaiting its answer, and while each new time waits its earlier hour is offered again and the new one is not",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInProposeDialog,
    checkInRequestDialog,
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
    await signIn();
    await clientCheckIns.open();
    await clientCheckIns.openRequestDialog();
    const requested =
      await checkInRequestDialog.sendSoonest(CLIENT_REQUEST_NOTE);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const [coachRequestTime] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      coachRequestTime!,
      COACH_REQUEST_NOTE,
    );
    const coachRequest = shownIn(coachRequestTime!);
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectNoRowMenu("Requests", COACH_REQUEST_NOTE);

    // act
    await coachCheckIns.reschedule("Requests", CLIENT_REQUEST_NOTE);

    // assert
    await checkInProposeDialog.expectOpen();
    await checkInProposeDialog.expectCurrentTime(requested);

    // act
    const coachTime =
      await checkInProposeDialog.sendSoonest(COACH_COUNTER_NOTE);

    // assert
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    await coachCheckIns.expectOwnNewTime(COACH_COUNTER_NOTE);
    await coachCheckIns.expectEarlierTimeStruck(COACH_COUNTER_NOTE, requested);
    const coachOffers = await checkInRequests.openTimesFor(client.clientId);
    expect(coachOffers).toContainEqual(requested.startsAt);
    expect(coachOffers).not.toContainEqual(coachTime.startsAt);

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(requested.startsAt, CLIENT_TIME_ZONE);
    await bookingPage.expectHourNotOffered(
      coachTime.startsAt,
      CLIENT_TIME_ZONE,
    );

    // arrange
    await page.goto("/store");
    await signIn();

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectNewTimeFromCoach(COACH_COUNTER_NOTE);
    await clientCheckIns.expectEarlierTimeStruck(COACH_COUNTER_NOTE, requested);

    // act
    await clientCheckIns.reschedule("Requests", COACH_REQUEST_NOTE);

    // assert
    await checkInProposeDialog.expectCurrentTime(coachRequest);

    // act
    const clientTime =
      await checkInProposeDialog.sendSoonest(CLIENT_COUNTER_NOTE);

    // assert
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    await clientCheckIns.expectOwnNewTime(CLIENT_COUNTER_NOTE);
    const clientOffers = await checkInRequests.openTimes();
    expect(clientOffers).toContainEqual(coachRequestTime);
    expect(clientOffers).not.toContainEqual(clientTime.startsAt);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectNewTimeFromClient(
      CLIENT_COUNTER_NOTE,
      client.firstName,
    );
    await coachCheckIns.expectEarlierTimeStruck(
      CLIENT_COUNTER_NOTE,
      coachRequest,
    );
  },
);

test(
  "answering a new time that was answered or cancelled meanwhile is refused with a message and the page shows where the check-in stands",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
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
    const [answeredTime, cancelledTime, answeredNewTime, cancelledNewTime] =
      await checkInRequests.openTimesFor(client.clientId);
    await checkInRequests.schedule(
      client.clientId,
      answeredTime!,
      ORIGINAL_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      cancelledTime!,
      ORIGINAL_NOTE,
    );
    const answeredId = await checkInRecords.idOf(
      client.clientId,
      answeredTime!,
    );
    const cancelledId = await checkInRecords.idOf(
      client.clientId,
      cancelledTime!,
    );
    await checkInRecords.markApproved(answeredId);
    await checkInRecords.markApproved(cancelledId);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await checkInRequests.proposeNewTime(answeredId, {
      startsAt: answeredNewTime!,
      note: ANSWERED_ELSEWHERE_NOTE,
      timeZone: CLIENT_TIME_ZONE,
    });
    await checkInRequests.proposeNewTime(cancelledId, {
      startsAt: cancelledNewTime!,
      note: CANCELLED_ELSEWHERE_NOTE,
      timeZone: CLIENT_TIME_ZONE,
    });
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();
    await coachCheckIns.expectNewTimeFromClient(
      ANSWERED_ELSEWHERE_NOTE,
      client.firstName,
    );
    await coachCheckIns.expectNewTimeFromClient(
      CANCELLED_ELSEWHERE_NOTE,
      client.firstName,
    );
    const elsewhereAnswer = await checkInRequests.decline(answeredId, {});

    // act
    await coachCheckIns.acceptNoLongerWaiting(ANSWERED_ELSEWHERE_NOTE);

    // assert
    expect(elsewhereAnswer.status).toBe(OK);
    await expect(
      coachCheckIns.checkIn("Requests", ANSWERED_ELSEWHERE_NOTE),
    ).toHaveCount(0);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", ANSWERED_ELSEWHERE_NOTE),
    ).toContainText("Cancelled");

    // arrange
    await coachCheckIns.expectNewTimeFromClient(
      CANCELLED_ELSEWHERE_NOTE,
      client.firstName,
    );
    await checkInRecords.markCancelled(cancelledId);

    // act
    await coachCheckIns.declineAnsweredElsewhere(CANCELLED_ELSEWHERE_NOTE);

    // assert
    await expect(
      coachCheckIns.checkIn("Requests", CANCELLED_ELSEWHERE_NOTE),
    ).toHaveCount(0);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", CANCELLED_ELSEWHERE_NOTE),
    ).toContainText("Cancelled");
  },
);

test(
  "the coach proposes a new time and cancels a check-in by keyboard alone with focus back on the row's menu whenever a dialog closes, and the client accepts by keyboard",
  { tag: "@completeness" },
  async ({
    cancelCheckInDialog,
    checkInProposeDialog,
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
    const [movedTime, cancelledTime] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      movedTime!,
      KEYBOARD_MOVED_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      cancelledTime!,
      KEYBOARD_CANCELLED_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, movedTime!),
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, cancelledTime!),
    );
    await coachCheckIns.open();
    await coachCheckIns.showTab("Upcoming");

    // act
    await coachCheckIns.rescheduleByKeyboard("Upcoming", KEYBOARD_MOVED_NOTE);

    // assert
    await checkInProposeDialog.expectOpen();

    // act
    await checkInProposeDialog.closeWithEscape();

    // assert
    await checkInProposeDialog.expectClosed();
    await coachCheckIns.expectRowMenuFocused("Upcoming", KEYBOARD_MOVED_NOTE);

    // act
    await coachCheckIns.rescheduleByKeyboard("Upcoming", KEYBOARD_MOVED_NOTE);
    const coachTime =
      await checkInProposeDialog.sendSoonestByKeyboard(KEYBOARD_COACH_NOTE);

    // assert
    await expect(page.getByText(NEW_TIME_PROPOSED)).toBeVisible();
    await coachCheckIns.expectOwnNewTime(KEYBOARD_COACH_NOTE);

    // act
    await coachCheckIns.cancelByKeyboard("Upcoming", KEYBOARD_CANCELLED_NOTE);

    // assert
    await cancelCheckInDialog.expectOpen(
      `${dayAndTimeOf(cancelledTime!)} with ${client.fullName}.`,
    );

    // act
    await cancelCheckInDialog.closeWithEscape();

    // assert
    await coachCheckIns.expectRowMenuFocused(
      "Upcoming",
      KEYBOARD_CANCELLED_NOTE,
    );

    // act
    await coachCheckIns.cancelByKeyboard("Upcoming", KEYBOARD_CANCELLED_NOTE);
    await cancelCheckInDialog.confirmByKeyboard();

    // assert
    await coachCheckIns.expectCancelledToast(client.fullName);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", KEYBOARD_CANCELLED_NOTE),
    ).toContainText("Cancelled");

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await clientCheckIns.open();

    // act
    await clientCheckIns.acceptByKeyboard(KEYBOARD_COACH_NOTE);

    // assert
    await clientCheckIns.expectUpcomingAt(KEYBOARD_COACH_NOTE, coachTime);
    await clientCheckIns.expectRescheduledFrom(
      KEYBOARD_COACH_NOTE,
      shownIn(movedTime!),
    );
  },
);
