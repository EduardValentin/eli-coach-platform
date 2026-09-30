import { clientPronouns } from "../support/client-pronouns";
import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
import { PROTOTYPE_DETAIL_REQUEST } from "../support/submitted-clients";
const JOURNEY_TIMEOUT_MS = 180_000;
const WITHDRAWAL_DAYS = 14;
const DATE_OF_BIRTH = new Date("1994-03-14T00:00:00Z");

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

const joinDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const callDayFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

const callClockFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
});

function shortCallMoment(startsAt: Date): string {
  return `${callDayFormatter.format(startsAt)} · ${callClockFormatter.format(startsAt)}`;
}

function ageToday(): string {
  const today = new Date();
  const hadBirthday =
    today.getMonth() > DATE_OF_BIRTH.getUTCMonth() ||
    (today.getMonth() === DATE_OF_BIRTH.getUTCMonth() &&
      today.getDate() >= DATE_OF_BIRTH.getUTCDate());

  return String(
    today.getFullYear() -
      DATE_OF_BIRTH.getUTCFullYear() -
      (hadBirthday ? 0 : 1),
  );
}

test("the coach finds her clients by status, name and join date and opens one", async ({
  coachClient,
  coachClients,
  page,
  provisionCoach,
  provisionInvitedClient,
  provisionSubmittedClient,
  scenarioTag,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const submitted = await provisionSubmittedClient("waiting");
  const invited = await provisionInvitedClient("pending");
  await page.goto("/store");
  await signInAsCoach();
  await page.goto("/coach");

  // act
  await coachClients.openFromSidebar();

  // assert
  await coachClients.expectOpen();

  // act
  await coachClients.search(scenarioTag);

  // assert
  await coachClients.expectSortedBy("Join date", "descending");
  await coachClients.expectRows([invited.fullName, submitted.fullName]);
  await coachClients.expectRow(invited.fullName, "Invited");
  await coachClients.expectRow(submitted.fullName, "Awaiting review");
  await coachClients.expectRowDetails(submitted.fullName, [
    submitted.email,
    "3 months",
  ]);
  await coachClients.expectRowLink(invited.fullName, "View details for");
  await coachClients.expectRowLink(submitted.fullName, "Review onboarding for");
  await coachClients.expectStatusCount("Awaiting review", 1);
  await coachClients.expectStatusCount("Invited", 1);

  // act
  await coachClients.filterByStatus("Awaiting review");

  // assert
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("status") === "awaiting-review",
  );
  await coachClients.expectRows([submitted.fullName]);

  // act
  await coachClients.filterByStatus("All statuses");
  await coachClients.sortBy("Client");

  // assert
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("sort") === "name",
  );
  await coachClients.expectSortedBy("Client", "ascending");
  await coachClients.expectRows([submitted.fullName, invited.fullName]);

  // act
  await coachClients.sortBy("Client");

  // assert
  await coachClients.expectSortedBy("Client", "descending");
  await coachClients.expectRows([invited.fullName, submitted.fullName]);

  // act
  await coachClients.openClient(submitted.fullName);

  // assert
  await coachClient.expectOpen(submitted.clientId);
  await coachClient.expectClient(submitted.fullName, submitted.email);
  await coachClient.expectProfile({
    Age: ageToday(),
    Gender: "Female",
    Country: "Romania",
    Phone: "—",
  });
  await coachClient.expectAssessmentCall({
    Call: shortCallMoment(submitted.callStartsAt),
    "Primary goal": "Build strength",
    "Reduced price": "No",
    "Booking notes": "—",
  });
  await coachClient.expectNoInvitation();
  await coachClient.expectStatus("Awaiting review");
  await coachClient.expectSubscription({
    Bundle: "3 months",
    "Payment date": dayMonthFormatter.format(submitted.paidAt),
    Start: `After the 14 days (${dayMonthFormatter.format(daysAfter(submitted.paidAt, WITHDRAWAL_DAYS))})`,
    "Start program": "—",
    "Renews on": `Once ${clientPronouns(submitted.gender).possessive} program starts`,
  });
});

test("the coach reaches a paid client's page from her assessment call", async ({
  coachAssessmentCalls,
  coachClient,
  page,
  provisionCoach,
  provisionSubmittedClient,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const submitted = await provisionSubmittedClient("waiting");
  await page.goto("/store");
  await signInAsCoach();
  await coachAssessmentCalls.open();
  await coachAssessmentCalls.search(submitted.email);

  // assert
  await expect(
    coachAssessmentCalls
      .call(submitted.email)
      .getByText("Paid", { exact: true }),
  ).toBeVisible();

  // act
  await coachAssessmentCalls.viewClient(submitted.email);

  // assert
  await coachClient.expectOpen(submitted.clientId);
  await coachClient.expectClient(submitted.fullName, submitted.email);
  await coachClient.expectStatus("Awaiting review");
});

test("the coach's status, search and sort survive a reload and a search with no match offers to clear the filters", async ({
  coachClients,
  page,
  provisionClientInState,
  provisionCoach,
  scenarioTag,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const invited = await provisionClientInState("invited-pending");
  const onboarding = await provisionClientInState("onboarding");
  const awaiting = await provisionClientInState("awaiting-review");
  const inReview = await provisionClientInState("in-review");
  const needsDetails = await provisionClientInState("needs-details");
  const approved = await provisionClientInState("approved");
  const byStatus = [
    invited,
    onboarding,
    awaiting,
    inReview,
    needsDetails,
    approved,
  ].map((client) => client.fullName);
  await page.goto("/store");
  await signInAsCoach();
  await coachClients.open();

  // act
  await coachClients.searchWithKeyboard(scenarioTag);

  // assert
  await coachClients.expectRow(invited.fullName, "Invited");
  await coachClients.expectRow(onboarding.fullName, "Onboarding");
  await coachClients.expectRow(awaiting.fullName, "Awaiting review");
  await coachClients.expectRow(inReview.fullName, "In review");
  await coachClients.expectRow(needsDetails.fullName, "Needs details");
  await coachClients.expectRow(approved.fullName, "Approved");
  for (const client of [invited, onboarding]) {
    await coachClients.expectRowLink(client.fullName, "View details for");
  }
  for (const client of [awaiting, inReview, needsDetails, approved]) {
    await coachClients.expectRowLink(client.fullName, "Review onboarding for");
  }
  await coachClients.expectStatusGroups(["Onboarding", "Active", "Inactive"]);
  await coachClients.expectStatusCount("All statuses", 6);
  for (const status of [
    "Invited",
    "Onboarding",
    "Awaiting review",
    "In review",
    "Needs details",
    "Approved",
  ]) {
    await coachClients.expectStatusCount(status, 1);
  }
  for (const status of ["Active", "Cancelled", "Inactive"]) {
    await coachClients.expectStatusCount(status, 0);
  }

  // act
  await coachClients.sortBy("Status");

  // assert
  await coachClients.expectSortedBy("Status", "ascending");
  await coachClients.expectRows(byStatus);

  // act
  await coachClients.sortBy("Status");

  // assert
  await coachClients.expectSortedBy("Status", "descending");
  await coachClients.expectRows([...byStatus].reverse());

  // act
  await coachClients.sortBy("Bundle / Plan");

  // assert
  await coachClients.expectSortedBy("Bundle / Plan", "ascending");

  // act
  await coachClients.sortBy("Status");
  await coachClients.filterByStatusWithKeyboard("Needs details");

  // assert
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("status") === "needs-details",
  );
  await coachClients.expectRows([needsDetails.fullName]);

  // act
  await coachClients.reload();

  // assert
  await coachClients.expectFilters({
    status: "Needs details",
    query: scenarioTag,
    sort: "status",
  });
  await coachClients.expectSortedBy("Status", "ascending");
  await coachClients.expectRows([needsDetails.fullName]);

  // act
  await coachClients.search(`${scenarioTag}-nobody`);

  // assert
  await coachClients.expectEmpty({
    title: "No clients found",
    description: "No clients match the Needs details status and your search.",
  });

  // act
  await coachClients.clearFilters();

  // assert
  await coachClients.expectFilters({
    status: "All statuses",
    query: "",
    sort: "status",
  });

  // act
  await coachClients.search(scenarioTag);

  // assert
  await coachClients.expectRows(byStatus);
});

test("a client with an account whose answers are not in yet reads Onboarding with nothing to review", async ({
  coachClient,
  coachClients,
  page,
  provisionClientInState,
  provisionCoach,
  signInAsCoach,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  await provisionCoach();
  const onboarding = await provisionClientInState("onboarding");
  await page.goto("/store");
  await signInAsCoach();
  await coachClients.open();

  // act
  await coachClients.search(onboarding.email);

  // assert
  await coachClients.expectRow(onboarding.fullName, "Onboarding");
  await coachClients.expectRowDetails(onboarding.fullName, [
    onboarding.email,
    "3 months",
    joinDateFormatter.format(onboarding.paidAt),
  ]);
  await coachClients.expectRowLink(onboarding.fullName, "View details for");

  // act
  await coachClients.openClient(onboarding.fullName);

  // assert
  await coachClient.expectOpen(onboarding.clientId);
  await coachClient.expectClient(onboarding.fullName, onboarding.email);
  await coachClient.expectNoInvitation();
  await coachClient.expectStatus("Onboarding");
  await coachClient.expectAnswersNotIn(onboarding.gender);
  await coachClient.expectNoReviewActions();
  await coachClient.expectNoMeasurements(onboarding.gender);
  await coachClient.expectSubscription({
    Bundle: "3 months",
    "Payment date": dayMonthFormatter.format(onboarding.paidAt),
    Start: `After the 14 days (${dayMonthFormatter.format(daysAfter(onboarding.paidAt, WITHDRAWAL_DAYS))})`,
    "Start program": "—",
    "Renews on": `Once ${clientPronouns(onboarding.gender).possessive} program starts`,
  });
});

test("a client account is refused the coach's client pages and every coach action", async ({
  coachClient,
  coachClients,
  onboardingRecords,
  page,
  portalRequests,
  provisionInvitedClient,
  provisionSubmittedClient,
  signIn,
}) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);

  // arrange
  const client = await provisionSubmittedClient("waiting");
  const invited = await provisionInvitedClient("pending");
  await page.goto("/store");
  await signIn();

  // act
  await coachClients.open();

  // assert
  await coachClients.expectRefused();

  // act
  await coachClient.open(client.clientId);

  // assert
  await coachClient.expectRefused();

  // act
  const refusals = [
    await portalRequests.resendInvitation(invited.clientId),
    await portalRequests.openReview(client.clientId),
    await portalRequests.requestDetails(
      client.clientId,
      PROTOTYPE_DETAIL_REQUEST,
    ),
    await portalRequests.approveAnswers(client.clientId),
  ];

  // assert
  expect(refusals).toEqual([403, 403, 403, 403]);
  expect(await onboardingRecords.reviewStamps()).toMatchObject({
    reviewOpenedAt: null,
    answersApprovedAt: null,
  });
  expect(await onboardingRecords.detailRequests()).toEqual([]);
});
