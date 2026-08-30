import { expect, test } from "../support/fixtures";

test("signing out returns to the Store as a signed-out visitor", async ({
  page,
  publicNav,
  signUpNewAccount,
}) => {
  // arrange
  await page.goto("/store");
  await signUpNewAccount();
  await publicNav.expectSignedIn();

  // act
  await publicNav.signOut();

  // assert
  await expect(page).toHaveURL(/\/store$/);
  await publicNav.expectSignedOut();
});
