import { E2E_APP_URL } from "../support/e2e-app";
import { COACH_NOTIFICATION_EMAIL, subjectsTo } from "../support/email-capture";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import { deliverStripeEvent } from "../support/stripe-events";
import {
  liftScheduledEndInStripe,
  scheduleEndInStripe,
} from "../support/stripe-subscriptions";
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
const SCHEDULED_BEFORE_NOTE = "A check-in before the end Eli scheduled.";
const SCHEDULED_ON_END_NOTE = "A check-in as the scheduled end comes.";
const SCHEDULED_AFTER_NOTE = "A check-in after the scheduled end.";
const ENDED_FIRST_NOTE = "A check-in her refund cancels.";
const ENDED_SECOND_NOTE = "Another check-in her refund cancels.";
const SCHEDULED_END_DAYS = 10;
const RECENT_PAYMENT_DAYS = 3;
const CANCELLED_CHECK_IN_SUBJECT = /cancelled the check-in/;
const OK = 200;
const CONFLICT = 409;
const TIME_TAKEN = { error: "time_taken" };
const NO_TIMES = { times: [] };

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

test(
  "Eli schedules the end of a client's coaching in Stripe, her check-ins at and after it are cancelled unannounced, and they stay cancelled once the end is lifted",
  { tag: "@completeness" },
  async ({
    bookingPage,
    checkInRecords,
    checkInRequests,
    coachAvailability,
    coachCheckIns,
    page,
    provisionCoach,
    provisionSubscribedClient,
    publicNav,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionSubscribedClient({
      start: "immediate",
      daysSincePayment: RECENT_PAYMENT_DAYS,
    });
    const coachingEndsAt = new Date(Date.now() + SCHEDULED_END_DAYS * DAY_MS);
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
    await checkInRequests.schedule(
      client.clientId,
      beforeTime,
      SCHEDULED_BEFORE_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      onEndTime!,
      SCHEDULED_ON_END_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      afterTime!,
      SCHEDULED_AFTER_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, beforeTime),
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, onEndTime!),
    );
    const scheduled = await scheduleEndInStripe(
      client.subscription,
      coachingEndsAt,
    );

    // act
    const scheduledDelivery = await deliverStripeEvent({
      baseURL: E2E_APP_URL,
      type: "customer.subscription.updated",
      objectId: client.subscription.subscriptionId,
      causedBy: scheduled.requestId,
    });
    await coachCheckIns.open();

    // assert
    expect(scheduledDelivery.status).toBe(OK);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", SCHEDULED_ON_END_NOTE),
    ).toContainText("Cancelled");
    await expect(
      coachCheckIns.checkIn("Past", SCHEDULED_AFTER_NOTE),
    ).toContainText("Cancelled");
    await coachCheckIns.showTab("Upcoming");
    await expect(
      coachCheckIns.checkIn("Upcoming", SCHEDULED_BEFORE_NOTE),
    ).toBeVisible();
    expect(
      startingFrom(
        await checkInRequests.openTimesFor(client.clientId),
        coachingEndsAt,
      ),
    ).toEqual([]);
    expect(await subjectsTo(client.email)).not.toContainEqual(
      expect.stringMatching(CANCELLED_CHECK_IN_SUBJECT),
    );

    // arrange
    await page.goto("/");
    await publicNav.signOut();

    // act + assert
    await bookingPage.expectHourOffered(onEndTime!, CLIENT_TIME_ZONE);
    await bookingPage.expectHourOffered(afterTime!, CLIENT_TIME_ZONE);

    // arrange
    const lifted = await liftScheduledEndInStripe(client.subscription);

    // act
    const liftedDelivery = await deliverStripeEvent({
      baseURL: E2E_APP_URL,
      type: "customer.subscription.updated",
      objectId: client.subscription.subscriptionId,
      causedBy: lifted.requestId,
    });
    await page.goto("/store");
    await signInAsCoach();
    await coachCheckIns.open();

    // assert
    expect(liftedDelivery.status).toBe(OK);
    await expect(
      coachCheckIns.checkIn("Upcoming", SCHEDULED_ON_END_NOTE),
    ).toHaveCount(0);
    await expect(
      coachCheckIns.checkIn("Upcoming", SCHEDULED_AFTER_NOTE),
    ).toHaveCount(0);
    await coachCheckIns.showTab("Past");
    await expect(
      coachCheckIns.checkIn("Past", SCHEDULED_ON_END_NOTE),
    ).toContainText("Cancelled");
    await expect(
      coachCheckIns.checkIn("Past", SCHEDULED_AFTER_NOTE),
    ).toContainText("Cancelled");
  },
);

test(
  "a client whose coaching ends with a full refund has every check-in to come cancelled, is offered no time to ask for, and her Check-ins page sends her to the ended page",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    clientEnded,
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
      daysSincePayment: RECENT_PAYMENT_DAYS,
    });
    await page.goto("/store");
    await signInAsCoach();
    const [firstTime, secondTime] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      firstTime!,
      ENDED_FIRST_NOTE,
    );
    await checkInRequests.schedule(
      client.clientId,
      secondTime!,
      ENDED_SECOND_NOTE,
    );
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, firstTime!),
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();

    // act
    const cancellation = await portalRequests.cancelSubscription();

    // assert
    expect(cancellation).toMatchObject({
      status: OK,
      body: { rule: "full-refund" },
    });

    // act
    const openTimes = await checkInRequests.openTimesAnswer();

    // assert
    expect(openTimes).toEqual({ status: OK, body: NO_TIMES });

    // act
    await clientCheckIns.visit();

    // assert
    await clientEnded.expectOpen();
    expect(await subjectsTo(client.email)).not.toContainEqual(
      expect.stringMatching(CANCELLED_CHECK_IN_SUBJECT),
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
    await expect(coachCheckIns.checkIn("Past", ENDED_FIRST_NOTE)).toContainText(
      "Cancelled",
    );
    await expect(
      coachCheckIns.checkIn("Past", ENDED_SECOND_NOTE),
    ).toContainText("Cancelled");
  },
);
