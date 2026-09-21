import { clearBookedAssessmentCalls } from "../support/assessment-calls";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";

const RUN_ID = resolveRunId();
const VISITOR_FIRST_NAME = "Visitor";
const VISITOR_LAST_NAME = RUN_ID;
const VISITOR_NAME = `${VISITOR_FIRST_NAME} ${VISITOR_LAST_NAME}`;
const VISITOR_EMAIL = `booking-${RUN_ID}@evoa.fit`;
const VISITOR_NOTES = "Recovering from a knee injury.";
const VISITOR_PHONE_NUMBER = "0712 345 678";
const VISITOR_PHONE_E164 = "+40712345678";
const BIRTH_YEAR = "1994";
const BIRTH_MONTH = "March";
const BIRTH_DAY_NAME = /March 14th, 1994/;
const BIRTH_DATE_ON_CARD = /\(14 Mar 1994\)/;

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
  await page.getByLabel("First name").fill(VISITOR_FIRST_NAME);
  await page.getByLabel("Last name").fill(VISITOR_LAST_NAME);
  await page.getByLabel("Email Address").fill(VISITOR_EMAIL);

  await page.getByRole("button", { name: "Date of birth" }).click();
  await page.getByRole("combobox", { name: "Year" }).click();
  await page.getByRole("option", { name: BIRTH_YEAR, exact: true }).click();
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: BIRTH_MONTH, exact: true }).click();
  await page
    .getByRole("grid", { name: /Birth date/ })
    .getByRole("button", { name: BIRTH_DAY_NAME })
    .click();

  await page.getByRole("combobox", { name: "Gender" }).click();
  await page.getByRole("option", { name: "Female", exact: true }).click();
  await page.getByRole("combobox", { name: "Primary goal" }).click();
  await page.getByRole("option", { name: "Build strength" }).click();
  await page.getByRole("combobox", { name: "Country", exact: true }).click();
  await page.getByRole("option", { name: "Romania", exact: true }).click();
  await page.getByLabel("Phone number").fill(VISITOR_PHONE_NUMBER);
  await page
    .getByLabel("Anything to share beforehand? (Optional)")
    .fill(VISITOR_NOTES);
  await page.getByRole("button", { name: "Schedule Call" }).click();

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
  await expect(
    bookedCall.getByRole("link", { name: VISITOR_PHONE_E164 }),
  ).toHaveAttribute("href", `tel:${VISITOR_PHONE_E164}`);
  await expect(bookedCall.getByText(BIRTH_DATE_ON_CARD)).toBeVisible();
  await expect(bookedCall.getByText("Female", { exact: true })).toBeVisible();
  await expect(bookedCall.getByText("Build strength")).toBeVisible();
  await expect(bookedCall.getByText("Romania", { exact: true })).toBeVisible();
  await expect(bookedCall.getByText(VISITOR_NOTES)).toBeVisible();
});
