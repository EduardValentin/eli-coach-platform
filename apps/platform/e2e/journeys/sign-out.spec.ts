import { expect, test } from "../support/fixtures";

test("signing out returns to the Store as a signed-out visitor", async ({
  page,
  publicNav,
  provisionAccount,
  signIn,
}) => {
  // arrange
  await provisionAccount("CLIENT");
  await page.goto("/store");
  await signIn();
  await publicNav.expectSignedIn();

  // act
  await publicNav.signOut();

  // assert
  await expect(page).toHaveURL(/\/store$/);
  await publicNav.expectSignedOut();
});
