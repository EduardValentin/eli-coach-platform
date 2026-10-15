import {
  clockTimeOf,
  shortDayOf,
  spacedPattern,
} from "../support/check-in-moments";
import { expect, test } from "../support/fixtures";

const BROWSER_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const REQUEST_NOTE = "Can we look at my deadlift?";
const REQUESTED = "Check-in requested";

test.use({ timezoneId: BROWSER_TIME_ZONE });

function requestedLineOf(clientName: string, startsAt: Date): RegExp {
  const when = `${shortDayOf(startsAt, BROWSER_TIME_ZONE)} at ${clockTimeOf(startsAt, BROWSER_TIME_ZONE)}`;

  return new RegExp(
    spacedPattern(`${clientName} asked for a check-in on ${when}.`),
  );
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
