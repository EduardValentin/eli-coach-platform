import { expect, test } from "../support/fixtures";

test("a visitor signs up from the Store and returns signed in", async ({
  page,
  publicNav,
  accountPortal,
  testEmail,
}) => {
  // arrange
  await page.goto("/store");
  await publicNav.expectSignedOut();

  // act
  await publicNav.signIn();
  await accountPortal.chooseSignUp();
  await accountPortal.signUpWithEmail(testEmail);
  await accountPortal.completeEmailOtp();

  // assert
  await expect(page).toHaveURL(/\/store$/);
  await publicNav.expectSignedIn();
});
