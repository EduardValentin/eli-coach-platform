import { COACH_NOTIFICATION_EMAIL, subjectsTo } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import { paidThrough } from "../support/subscribed-clients";

const CLIENT_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 300_000;
const DAYS_SINCE_PAYMENT = 84;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const END_MARGIN_MS = 2 * HOUR_MS;
const BEFORE_NOTE = "Our last check-in before your plan ends.";
const ON_END_NOTE = "A check-in right as your plan ends.";
const AFTER_NOTE = "A check-in after your plan ends.";
const PAST_END_NOTE = "One more check-in after the end.";
const CANCELLED_CHECK_IN_SUBJECT = /cancelled the check-in/;
const OK = 200;
const CONFLICT = 409;
const TIME_TAKEN = { error: "time_taken" };

test.use({ timezoneId: CLIENT_TIME_ZONE });

function dayAfter(instant: Date): Date {
  return new Date(instant.getTime() + DAY_MS);
}

function startingFrom(times: readonly Date[], cutoff: Date): Date[] {
  return times.filter((time) => time.getTime() >= cutoff.getTime());
}

test(
  "a client who cancels her coaching has the check-ins at and after her paid-through end cancelled unannounced, and neither picker offers a day past the end",
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
      daysSincePayment: DAYS_SINCE_PAYMENT,
    });
    const coachingEndsAt = paidThrough(client.paidAt);
    await page.goto("/store");
    await signInAsCoach();
    const offered = await checkInRequests.openTimesFor(client.clientId);
    const beforeTime = offered
      .filter(
        (time) => time.getTime() <= coachingEndsAt.getTime() - END_MARGIN_MS,
      )
      .at(-1)!;
    const [onEndTime] = startingFrom(
      offered,
      new Date(coachingEndsAt.getTime() + END_MARGIN_MS),
    );
    const [afterTime] = startingFrom(
      offered,
      new Date(dayAfter(coachingEndsAt).getTime() + END_MARGIN_MS),
    );
    await checkInRequests.schedule(client.clientId, beforeTime, BEFORE_NOTE);
    await checkInRequests.schedule(client.clientId, onEndTime!, ON_END_NOTE);
    await checkInRequests.schedule(client.clientId, afterTime!, AFTER_NOTE);
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, beforeTime),
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, onEndTime!),
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);

    // act
    const cancellation = await portalRequests.cancelSubscription();

    // assert
    expect(cancellation.status).toBe(OK);

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectInOrder("Upcoming", [BEFORE_NOTE]);
    await clientCheckIns.expectEmpty("Requests", "No open requests");
    await clientCheckIns.showTab("Past");
    await expect(clientCheckIns.checkIn("Past", ON_END_NOTE)).toContainText(
      "Cancelled",
    );
    await expect(clientCheckIns.checkIn("Past", AFTER_NOTE)).toContainText(
      "Cancelled",
    );
    expect(await subjectsTo(client.email)).not.toContainEqual(
      expect.stringMatching(CANCELLED_CHECK_IN_SUBJECT),
    );
    expect(await subjectsTo(COACH_NOTIFICATION_EMAIL)).not.toContain(
      `${client.fullName} cancelled the check-in`,
    );
    expect(
      startingFrom(await checkInRequests.openTimes(), coachingEndsAt),
    ).toEqual([]);

    // act
    await clientCheckIns.openRequestDialog();

    // assert
    await checkInRequestDialog.expectDayUnavailable(
      dayAfter(coachingEndsAt),
      CLIENT_TIME_ZONE,
    );
    expect(clientProblems).toEqual([]);

    // arrange
    await checkInRequestDialog.closeWithEscape();
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(onEndTime!, CLIENT_TIME_ZONE);
    await bookingPage.expectHourOffered(afterTime!, CLIENT_TIME_ZONE);

    // arrange
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.showTab("Past");
    await expect(coachCheckIns.checkIn("Past", ON_END_NOTE)).toContainText(
      "Cancelled",
    );
    await expect(coachCheckIns.checkIn("Past", AFTER_NOTE)).toContainText(
      "Cancelled",
    );
    await coachCheckIns.showTab("Upcoming");
    await expect(coachCheckIns.checkIn("Upcoming", BEFORE_NOTE)).toBeVisible();
    expect(
      startingFrom(
        await checkInRequests.openTimesFor(client.clientId),
        coachingEndsAt,
      ),
    ).toEqual([]);

    // act
    await coachCheckIns.reschedule("Upcoming", BEFORE_NOTE);

    // assert
    await checkInProposeDialog.expectOpen();
    await checkInProposeDialog.expectDayUnavailable(
      dayAfter(coachingEndsAt),
      CLIENT_TIME_ZONE,
    );
    expect(coachProblems).toEqual([]);
  },
);

test(
  "the coach's schedule picker for a client whose coaching ends stops at the end, and scheduling past it is refused",
  { tag: "@completeness" },
  async ({
    checkInRequests,
    checkInScheduleDialog,
    coachAvailability,
    coachClient,
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
      daysSincePayment: DAYS_SINCE_PAYMENT,
    });
    const coachingEndsAt = paidThrough(client.paidAt);
    await page.goto("/store");
    await signIn();
    const pastEndTime = startingFrom(
      await checkInRequests.openTimes(),
      coachingEndsAt,
    ).at(-1);
    await portalRequests.cancelSubscription();
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    await coachClient.open(client.clientId);

    // act
    await coachClient.openScheduleDialog();

    // assert
    await checkInScheduleDialog.expectDayUnavailable(
      dayAfter(coachingEndsAt),
      CLIENT_TIME_ZONE,
    );
    expect(
      startingFrom(
        await checkInRequests.openTimesFor(client.clientId),
        coachingEndsAt,
      ),
    ).toEqual([]);

    // arrange
    await checkInScheduleDialog.closeWithEscape();
    await checkInScheduleDialog.expectClosed();

    // act
    const answer = await checkInRequests.schedule(
      client.clientId,
      pastEndTime!,
      PAST_END_NOTE,
    );

    // assert
    expect(answer).toEqual({ status: CONFLICT, body: TIME_TAKEN });
  },
);
