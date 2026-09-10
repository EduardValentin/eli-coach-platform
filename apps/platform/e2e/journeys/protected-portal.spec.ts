import { expect, test } from "../support/fixtures";

test("a signed-out coach who tries the client portal signs in, is denied, and is sent to the coach portal", async ({
  page,
  accountPortal,
  provisionAccount,
  testEmail,
}) => {
  // arrange
  await provisionAccount("COACH");

  // act
  await page.goto("/client");

  // assert
  await accountPortal.expectEmailStepVisible();

  // act
  await accountPortal.signInWithEmail(testEmail);
  await accountPortal.completeEmailOtp();

  // assert
  await expect(page).toHaveURL(/\/client$/);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this page" }),
  ).toBeVisible();
  const backToCoachPortal = page.getByRole("link", { name: "Back to the coach portal" });
  await expect(backToCoachPortal).toBeVisible();

  // act
  await backToCoachPortal.click();

  // assert
  await expect(page).toHaveURL(/\/coach$/);
});
