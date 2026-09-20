import { clearBookedAssessmentCalls } from "../support/assessment-calls";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";

const RUN_ID = resolveRunId();
const VISITOR_NAME = `Visitor ${RUN_ID}`;
const VISITOR_EMAIL = `booking-${RUN_ID}@evoa.fit`;
const VISITOR_NOTES = "Recovering from a knee injury.";

test("a visitor books an assessment call and the coach sees it", async ({
  page,
  provisionAccount,
  publicNav,
  signIn,
}) => {
  // arrange
  await clearBookedAssessmentCalls();
  await provisionAccount("COACH");
  await page.goto("/book");
  const calendar = page.getByRole("grid", { name: "Available days" });

  // act
  await calendar.getByRole("button", { disabled: false }).first().click();
  await page.getByRole("main").locator("button[aria-pressed]").first().click();
  await page.getByRole("button", { name: "Continue to your details" }).click();
  await page.getByLabel("Full Name").fill(VISITOR_NAME);
  await page.getByLabel("Email Address").fill(VISITOR_EMAIL);
  await page
    .getByLabel("Anything to share beforehand? (Optional)")
    .fill(VISITOR_NOTES);
  await page.getByRole("button", { name: "Schedule Assessment" }).click();

  // assert
  await expect(
    page.getByRole("heading", { name: "You're booked!" }),
  ).toBeVisible();
  await expect(page.getByText(VISITOR_EMAIL)).toBeVisible();

  // act
  await page.goto("/store");
  await signIn();
  await publicNav.openPortal("COACH");

  // assert
  await expect(
    page.getByRole("heading", { name: "Upcoming calls" }),
  ).toBeVisible();
  await expect(page.getByText(VISITOR_NAME)).toBeVisible();

  // act
  await page.goto("/coach/assessment-calls");

  // assert
  await expect(
    page.getByRole("heading", { level: 1, name: "Assessment calls" }),
  ).toBeVisible();
  const bookedCall = page
    .getByRole("list", { name: "Assessment calls" })
    .getByRole("listitem")
    .filter({ hasText: VISITOR_NAME });
  await expect(bookedCall.getByText(VISITOR_EMAIL)).toBeVisible();
  await expect(bookedCall.getByText(VISITOR_NOTES)).toBeVisible();
});
