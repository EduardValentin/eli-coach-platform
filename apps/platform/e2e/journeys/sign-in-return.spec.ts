import { expect, test } from "../support/fixtures";

test("a returning user signs in from Pricing and lands back on Pricing", async ({
  page,
  publicNav,
  provisionAccount,
  signIn,
}) => {
  // arrange
  await provisionAccount("CLIENT");
  await page.goto("/store");
  await signIn();
  await publicNav.signOut();

  // act
  await page.goto("/pricing");
  await signIn();

  // assert
  await expect(page).toHaveURL(/\/pricing$/);
  await publicNav.expectSignedIn();
});
