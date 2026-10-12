import { countCallsLeftToday } from "../support/assessment-calls";
import { clockTimeOf, spacedPattern } from "../support/check-in-moments";
import { expect, test } from "../support/fixtures";
import { collectPageProblems } from "../support/page-problems";
import { setPhoneViewport } from "../support/viewport";

const CLIENT_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const FORM_CHECK_NOTE = "Can we go over my squat form?";
const SCHEDULED_NOTE = "Let us plan your next block.";
const PROPOSED_NOTE = "A quick progress review.";
const MINUTES_TO_START = 5;
const MINUTES_SINCE_START = -60;

test.use({ timezoneId: CLIENT_TIME_ZONE });

function shownTimeOf(instant: Date): RegExp {
  return new RegExp(spacedPattern(clockTimeOf(instant, CLIENT_TIME_ZONE)));
}

test(
  "a client asks for a check-in, her coach sees it waiting at a glance and reviews it, and the client sees her next check-in",
  { tag: "@critical" },
  async ({
    checkInRequestDialog,
    clientCheckIns,
    clientPortalShell,
    coachAvailability,
    coachCheckIns,
    coachClients,
    coachDashboard,
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
    const requested = await checkInRequestDialog.sendSoonest(FORM_CHECK_NOTE);
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const coachProblems = collectPageProblems(page);
    const callsLeftToday = await countCallsLeftToday(CLIENT_TIME_ZONE);

    // act
    await coachDashboard.open();

    // assert
    await coachDashboard.expectGreeting({ calls: callsLeftToday, checkIns: 1 });
    await coachDashboard.expectPendingCheckIns([client.fullName]);

    // act
    await coachClients.openFromSidebar();

    // assert
    await coachClients.expectOpen();
    await coachCheckIns.expectNavigationCount(1);

    // act
    await coachDashboard.openFromNavigation();
    await coachDashboard.review(client.fullName);

    // assert
    await coachCheckIns.expectReviewLanded(client.fullName);

    // act
    await coachCheckIns.approve(client.fullName);
    await coachDashboard.openFromNavigation();

    // assert
    await coachDashboard.expectNoPendingCheckIns();
    await coachCheckIns.expectNavigationCount(0);
    expect(coachProblems).toEqual([]);

    // arrange
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    const clientProblems = collectPageProblems(page);

    // act
    await page.goto("/client");

    // assert
    await expect(clientPortalShell.nextCheckIn()).toContainText(
      shownTimeOf(requested.startsAt),
    );
    await clientPortalShell.expectNextCheckInJoin("quiet");

    // act
    await clientPortalShell.manageCheckInsFromWidget();

    // assert
    await clientCheckIns.expectOpen();
    expect(clientProblems).toEqual([]);
  },
);

test(
  "on her phone a client finds her next check-in in the More sheet and the check-ins waiting on her in the tab bar",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientPortalShell,
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
    await page.goto("/coach");
    const [scheduledAt, proposedAt] = await checkInRequests.openTimesFor(
      client.clientId,
    );
    await checkInRequests.schedule(
      client.clientId,
      scheduledAt!,
      SCHEDULED_NOTE,
    );
    await checkInRequests.schedule(client.clientId, proposedAt!, PROPOSED_NOTE);
    await checkInRecords.markApproved(
      await checkInRecords.idOf(client.clientId, scheduledAt!),
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signIn();
    await setPhoneViewport(page);

    // act
    await page.goto("/client");

    // assert
    await clientPortalShell.expectCheckInsCountInTabs(1);

    // act
    await clientPortalShell.openMore();

    // assert
    await clientPortalShell.expectSheetOpen();
    const widget = clientPortalShell.nextCheckInInSheet();
    await expect(widget).toContainText(shownTimeOf(scheduledAt!));
    await expect(widget.getByRole("link", { name: "Join Meet" })).toBeVisible();
    await expect(
      widget.getByRole("link", { name: "Manage check-ins" }),
    ).toBeVisible();
  },
);

test(
  "a Review link to a check-in that is not there opens the coach's check-ins as usual",
  { tag: "@completeness" },
  async ({ coachCheckIns, page, provisionAccount, signIn }) => {
    // arrange
    await provisionAccount("COACH");
    await page.goto("/store");
    await signIn();
    const problems = collectPageProblems(page);

    // act
    await coachCheckIns.visitReview("missing");

    // assert
    await coachCheckIns.expectReviewOpenedAsUsual("Upcoming");
    expect(problems).toEqual([]);
  },
);

test(
  "Join Meet stands out in the client's Next check-in shortly before it starts",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    clientPortalShell,
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
    const [soonest] = await checkInRequests.openTimes();
    await checkInRequests.ask(soonest!, CLIENT_TIME_ZONE);
    const checkInId = await checkInRecords.idOf(client.clientId, soonest!);
    await checkInRecords.markApproved(checkInId);
    await checkInRecords.moveStart(checkInId, MINUTES_TO_START);

    // act
    await page.goto("/client");

    // assert
    await clientPortalShell.expectNextCheckInJoin("emphasised");
  },
);

test(
  "a client with no approved check-in has no Next check-in",
  { tag: "@completeness" },
  async ({ clientPortalShell, page, provisionSubmittedClient, signIn }) => {
    // arrange
    await provisionSubmittedClient("waiting");
    await page.goto("/store");
    await signIn();

    // act
    await page.goto("/client");

    // assert
    await clientPortalShell.expectNoNextCheckIn();
  },
);

test(
  "a request nobody answered before its time leaves the coach nothing to review",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    clientCheckIns,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
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
    const [soonest] = await checkInRequests.openTimes();
    await checkInRequests.ask(soonest!, CLIENT_TIME_ZONE);
    await checkInRecords.moveStart(
      await checkInRecords.idOf(client.clientId, soonest!),
      MINUTES_SINCE_START,
    );
    await page.goto("/");
    await publicNav.signOut();
    await page.goto("/store");
    await signInAsCoach();
    const callsLeftToday = await countCallsLeftToday(CLIENT_TIME_ZONE);

    // act
    await coachDashboard.open();

    // assert
    await coachDashboard.expectGreeting({ calls: callsLeftToday, checkIns: 0 });
    await coachDashboard.expectNoPendingCheckIns();

    // act
    await coachDashboard.viewAllCheckIns();

    // assert
    await coachCheckIns.expectOpen();
  },
);
