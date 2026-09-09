import { expect, test } from "../support/fixtures";

test("a returning user signs in from Pricing and lands back on Pricing", async ({
  page,
  publicNav,
  provisionAccount,
  signIn,
}) => {
  // arrange: sign in once and out again, so the sign-in below is what a
  // genuinely returning user does.
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
