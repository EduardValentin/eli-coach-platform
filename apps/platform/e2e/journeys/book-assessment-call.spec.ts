import { BOOKING_PROFILE } from "../support/booking-page";
import { expect, test } from "../support/fixtures";
import { resolveRunId } from "../support/run-id";

const RUN_ID = resolveRunId();
const VISITOR_FIRST_NAME = "Visitor";
const VISITOR_LAST_NAME = RUN_ID;
const VISITOR_NAME = `${VISITOR_FIRST_NAME} ${VISITOR_LAST_NAME}`;
const VISITOR_NOTES = "Recovering from a knee injury.";

test("a visitor books an assessment call and the coach sees it", async ({
  bookingPage,
  coachAssessmentCalls,
  page,
  provisionAccount,
  publicNav,
  signIn,
  visitorEmail,
}) => {
  // arrange
  await provisionAccount("COACH");

  // act
  await bookingPage.bookSoonestCall({
    email: visitorEmail,
    firstName: VISITOR_FIRST_NAME,
    lastName: VISITOR_LAST_NAME,
    notes: VISITOR_NOTES,
  });

  // assert
  await expect(
    page.getByRole("heading", { name: "You're booked!" }),
  ).toBeVisible();
  await expect(page.getByText(visitorEmail)).toBeVisible();

  // act
  await page.goto("/store");
  await signIn();
  await publicNav.openPortal("COACH");

  // assert
  await expect(
    page.getByRole("heading", { name: "Upcoming calls" }),
  ).toBeVisible();

  // act
  await coachAssessmentCalls.open();
  await coachAssessmentCalls.search(visitorEmail);

  // assert
  await expect(
    page.getByRole("heading", { level: 1, name: "Assessment calls" }),
  ).toBeVisible();
  const bookedCall = coachAssessmentCalls.call(VISITOR_NAME);
  await expect(bookedCall.getByText(visitorEmail)).toBeVisible();
  await expect(
    bookedCall.getByRole("link", { name: BOOKING_PROFILE.phoneNumberE164 }),
  ).toHaveAttribute("href", `tel:${BOOKING_PROFILE.phoneNumberE164}`);
  await expect(
    bookedCall.getByText(BOOKING_PROFILE.birthDateOnCoachCard),
  ).toBeVisible();
  await expect(
    bookedCall.getByText(BOOKING_PROFILE.gender, { exact: true }),
  ).toBeVisible();
  await expect(bookedCall.getByText(BOOKING_PROFILE.primaryGoal)).toBeVisible();
  await expect(
    bookedCall.getByText(BOOKING_PROFILE.country, { exact: true }),
  ).toBeVisible();
  await expect(bookedCall.getByText(VISITOR_NOTES)).toBeVisible();
});

test("a visitor describes her gender as female, male or prefer not to say", async ({
  bookingPage,
}) => {
  // act
  await bookingPage.openDetails();

  // assert
  await bookingPage.expectGenderOptions([
    "Female",
    "Male",
    "Prefer not to say",
  ]);
});
