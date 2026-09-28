import { expect, test } from "../support/fixtures";
import { daysAfter } from "../support/paid-clients";
const JOURNEY_TIMEOUT_MS = 180_000;
const WITHDRAWAL_DAYS = 14;
const DATE_OF_BIRTH = new Date("1994-03-14T00:00:00Z");

const dayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});

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
    "Primary goal": "Build strength",
    "Pricing tier": "Regular",
    "Booking notes": "—",
  });
  await coachClient.expectNoInvitation();
  await coachClient.expectStatus("Awaiting review");
  await coachClient.expectSubscription({
    Bundle: "3 months",
    "Payment date": dayMonthFormatter.format(submitted.paidAt),
    Start: `After the 14 days (${dayMonthFormatter.format(daysAfter(submitted.paidAt, WITHDRAWAL_DAYS))})`,
    "Start program": "—",
    "Renews on": "Once her program starts",
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
