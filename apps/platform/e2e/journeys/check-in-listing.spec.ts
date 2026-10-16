import {
  clockTimeOf,
  spacedPattern,
  weeklyStartsBetween,
} from "../support/check-in-moments";
import type { CheckInRecords } from "../support/check-in-records";
import { COACH_TIME_ZONE } from "../support/coach-availability";
import { expect, test } from "../support/fixtures";
import { daysAfter, type PaidClient } from "../support/paid-clients";
import { paidThrough } from "../support/subscribed-clients";

const CLIENT_TIME_ZONE = "Europe/London";
const JOURNEY_TIMEOUT_MS = 240_000;
const WITHDRAWAL_DAYS = 14;
const CHECK_INS_PER_PAGE = 10;
const FULL_PAGE_AND_ONE = CHECK_INS_PER_PAGE + 1;
const WEEKLY_HOUR = 18;
const WEEKLY = { day: "Monday", hour: WEEKLY_HOUR, timeZone: COACH_TIME_ZONE };
const WEEKLY_CHOICE = { weekday: "monday", hour: WEEKLY_HOUR };
const REQUESTED = "Check-in requested";
const CREATED = 201;
const LAST_PAGE_ALONE = "Showing 11–11 of 11";
const SOONEST_FIRST = {
  direction: "Soonest first",
  toggle: "released",
} as const;
const LATEST_FIRST = { direction: "Latest first", toggle: "pressed" } as const;

test.use({ timezoneId: CLIENT_TIME_ZONE });

test.beforeEach(async ({ checkInRecords }) => {
  await checkInRecords.cancelEveryUpcoming();
});

test.afterEach(async ({ checkInRecords }) => {
  await checkInRecords.cancelEveryUpcoming();
});

function shownTimeOf(instant: Date): RegExp {
  return new RegExp(spacedPattern(clockTimeOf(instant, CLIENT_TIME_ZONE)));
}

function lastNameOf(client: PaidClient): string {
  return client.fullName.slice(client.firstName.length + 1);
}

function repeated(text: string, times: number): string[] {
  return Array.from({ length: times }, () => text);
}

function seriesWeeksOf(client: PaidClient): Date[] {
  return weeklyStartsBetween(WEEKLY, {
    from: daysAfter(client.paidAt, WITHDRAWAL_DAYS),
    until: paidThrough(client.paidAt),
  });
}

async function holdRequests(
  checkInRecords: CheckInRecords,
  client: PaidClient,
  times: readonly Date[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const startsAt of times) {
    await checkInRecords.holdHourFor(
      client.clientId,
      startsAt,
      COACH_TIME_ZONE,
    );
    ids.push(await checkInRecords.idOf(client.clientId, startsAt));
  }

  return ids;
}

async function approveCheckIns(
  checkInRecords: CheckInRecords,
  client: PaidClient,
  times: readonly Date[],
): Promise<void> {
  for (const checkInId of await holdRequests(checkInRecords, client, times)) {
    await checkInRecords.markApproved(checkInId);
  }
}

test(
  "the coach narrows, searches, sorts and pages through her check-ins, keeps her place on a reload, and a Review link lands on the page holding its check-in",
  { tag: "@critical" },
  async ({
    checkInRecords,
    checkInRequests,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
    page,
    provisionClientInState,
    provisionCoach,
    provisionSubmittedClient,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const weeklyClient = await provisionSubmittedClient("waiting");
    const askingClient = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await page.goto("/coach");
    const clashingWeeks = seriesWeeksOf(weeklyClient).slice(
      0,
      CHECK_INS_PER_PAGE,
    );
    await approveCheckIns(checkInRecords, askingClient, clashingWeeks);
    const [soonest] = await checkInRequests.openTimesFor(askingClient.clientId);
    const [requestId] = await holdRequests(checkInRecords, askingClient, [
      soonest!,
    ]);
    const seriesAnswer = await checkInRequests.setUpSeries(
      weeklyClient.clientId,
      WEEKLY_CHOICE,
    );
    expect(seriesAnswer.status).toBe(CREATED);

    // act
    await coachCheckIns.open();

    // assert
    await coachCheckIns.expectTabShown("Requests");
    await coachCheckIns.expectOptionCounts("Kind", {
      "All kinds": FULL_PAGE_AND_ONE,
      Weekly: CHECK_INS_PER_PAGE,
      "Ad-hoc": 1,
    });

    // act
    await coachCheckIns.chooseKind("Weekly");

    // assert
    await coachCheckIns.expectAddress({ kind: "recurring" });
    await coachCheckIns.expectInOrder(
      "Requests",
      repeated(weeklyClient.fullName, CHECK_INS_PER_PAGE),
    );

    // act
    await coachCheckIns.chooseKind("All kinds");
    await coachCheckIns.search(lastNameOf(askingClient));

    // assert
    await coachCheckIns.expectAddress({ q: lastNameOf(askingClient) });
    await coachCheckIns.expectInOrder("Requests", [askingClient.fullName]);

    // act
    await coachCheckIns.search("");
    await coachCheckIns.toggleSort();

    // assert
    await coachCheckIns.expectAddress({ dir: "desc" });
    await coachCheckIns.expectSort(LATEST_FIRST);

    // act
    await coachCheckIns.goToPage(2);

    // assert
    await coachCheckIns.expectAddress({ dir: "desc", page: "2" });
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
    await coachCheckIns.expectInOrder("Requests", [askingClient.fullName]);

    // act
    await page.reload();

    // assert
    await coachCheckIns.expectAddress({ dir: "desc", page: "2" });
    await coachCheckIns.expectSort(LATEST_FIRST);
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
    await coachCheckIns.expectInOrder("Requests", [askingClient.fullName]);

    // act
    await coachDashboard.openFromNavigation();
    await coachDashboard.review(askingClient.fullName);

    // assert
    await coachCheckIns.expectReviewLandedOn("Requests", askingClient.fullName);
    await coachCheckIns.expectCheckInFocused("Requests", requestId!);
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
    await coachCheckIns.expectSort(SOONEST_FIRST);
  },
);

test(
  "the client narrows her requests by who must answer and sees the no-match state with Clear filters",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
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
    await page.goto("/client");
    const [firstProposed, secondProposed, ownRequest] =
      await checkInRequests.openTimes();
    for (const proposedAt of [firstProposed!, secondProposed!]) {
      await checkInRecords.proposeHourFor(
        client.clientId,
        proposedAt,
        CLIENT_TIME_ZONE,
      );
    }
    await checkInRecords.holdHourFor(
      client.clientId,
      ownRequest!,
      CLIENT_TIME_ZONE,
    );

    // act
    await clientCheckIns.open();

    // assert
    await clientCheckIns.expectTabShown("Requests");
    await clientCheckIns.expectOptionCounts("Waiting on", {
      "All requests": 3,
      "Needs your answer": 2,
      "Waiting for your coach": 1,
    });

    // act
    await clientCheckIns.chooseWaiting("Needs your answer");

    // assert
    await clientCheckIns.expectAddress({ waiting: "you" });
    await clientCheckIns.expectInOrder("Requests", [
      shownTimeOf(firstProposed!),
      shownTimeOf(secondProposed!),
    ]);

    // act
    await clientCheckIns.chooseWaiting("Waiting for your coach");

    // assert
    await clientCheckIns.expectAddress({ waiting: "them" });
    await clientCheckIns.expectInOrder("Requests", [shownTimeOf(ownRequest!)]);
    await clientCheckIns.expectOptionCounts("Kind", {
      "All kinds": 1,
      Weekly: 0,
      "Ad-hoc": 1,
    });

    // act
    await clientCheckIns.chooseKind("Weekly");

    // assert
    await clientCheckIns.expectAddress({ waiting: "them", kind: "recurring" });
    await clientCheckIns.expectNoMatch();

    // act
    await clientCheckIns.clearFilters();

    // assert
    await clientCheckIns.expectAddress({});
    await clientCheckIns.expectTabShown("Requests");
    await clientCheckIns.expectInOrder("Requests", [
      shownTimeOf(firstProposed!),
      shownTimeOf(secondProposed!),
      shownTimeOf(ownRequest!),
    ]);
  },
);

test(
  "unknown address values fall back and the back button restores the view",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    coachAvailability,
    coachCheckIns,
    coachDashboard,
    page,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await page.goto("/coach");
    const times = await checkInRequests.openTimesFor(client.clientId);
    await approveCheckIns(
      checkInRecords,
      client,
      times.slice(0, FULL_PAGE_AND_ONE),
    );

    // act
    await coachCheckIns.visitAddress({
      view: "elsewhere",
      kind: "monthly",
      waiting: "nobody",
      dir: "sideways",
      page: "first",
    });

    // assert
    await coachCheckIns.expectTabShown("Upcoming");
    await coachCheckIns.expectKind("All kinds");
    await coachCheckIns.expectSort(SOONEST_FIRST);
    await coachCheckIns.expectShowing("Showing 1–10 of 11");

    // act
    await coachCheckIns.visitAddress({ page: "9" });

    // assert
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);

    // arrange
    await coachCheckIns.open();
    await coachCheckIns.chooseKind("Ad-hoc");
    await coachCheckIns.toggleSort();
    await coachCheckIns.goToPage(2);
    await coachDashboard.openFromNavigation();

    // act
    await page.goBack();

    // assert
    await coachCheckIns.expectAddress({
      kind: "ad-hoc",
      dir: "desc",
      page: "2",
    });
    await coachCheckIns.expectTabShown("Upcoming");
    await coachCheckIns.expectKind("Ad-hoc");
    await coachCheckIns.expectSort(LATEST_FIRST);
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
  },
);

test(
  "a bell link opened while the coach is on her check-ins lands on a request that arrived after the page loaded",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    coachAvailability,
    coachCheckIns,
    notificationBell,
    notificationRecords,
    page,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await page.goto("/coach");
    const times = await checkInRequests.openTimesFor(client.clientId);
    const arrivingAt = times[CHECK_INS_PER_PAGE]!;
    await holdRequests(
      checkInRecords,
      client,
      times.slice(0, CHECK_INS_PER_PAGE),
    );
    await notificationRecords.markCoachNotificationsRead();
    await notificationBell.installClock();
    await coachCheckIns.open();
    await coachCheckIns.expectTabShown("Requests");
    const [arrivedId] = await holdRequests(checkInRecords, client, [
      arrivingAt,
    ]);
    await notificationRecords.arriveForCoach("check-in.requested", {
      checkInId: arrivedId!,
      clientName: client.fullName,
      startsAt: arrivingAt.toISOString(),
    });
    await notificationBell.waitForArrivalToast(REQUESTED);

    // act
    await notificationBell.open();
    await notificationBell.openRow(REQUESTED, client.fullName);

    // assert
    await expect(page).toHaveURL(
      new RegExp(`/coach/checkins\\?checkin=${arrivedId}$`),
    );
    await coachCheckIns.expectCheckInFocused("Requests", arrivedId!);
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
  },
);

test(
  "the toolbar and the pager work by keyboard",
  { tag: "@completeness" },
  async ({
    checkInRecords,
    checkInRequests,
    coachAvailability,
    coachCheckIns,
    page,
    provisionClientInState,
    provisionCoach,
    signInAsCoach,
  }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    // arrange
    await coachAvailability.openEveryDay();
    await provisionCoach();
    const client = await provisionClientInState("approved");
    await page.goto("/store");
    await signInAsCoach();
    await page.goto("/coach");
    const times = await checkInRequests.openTimesFor(client.clientId);
    await approveCheckIns(
      checkInRecords,
      client,
      times.slice(0, FULL_PAGE_AND_ONE),
    );
    await holdRequests(checkInRecords, client, [times[FULL_PAGE_AND_ONE]!]);
    await coachCheckIns.open();

    // act
    await coachCheckIns.chooseKindByKeyboard({ label: "Ad-hoc", count: 1 });
    await coachCheckIns.chooseWaitingByKeyboard({
      label: "Needs your answer",
      count: 1,
    });

    // assert
    await coachCheckIns.expectAddress({ kind: "ad-hoc", waiting: "you" });
    await coachCheckIns.expectInOrder("Requests", [client.fullName]);

    // act
    await coachCheckIns.showTabByKeyboard("Upcoming");
    await coachCheckIns.toggleSortByKeyboard();
    await coachCheckIns.goToPageByKeyboard(2);

    // assert
    await coachCheckIns.expectAddress({
      view: "upcoming",
      kind: "ad-hoc",
      dir: "desc",
      page: "2",
    });
    await coachCheckIns.expectSort(LATEST_FIRST);
    await coachCheckIns.expectShowing(LAST_PAGE_ALONE);
  },
);
