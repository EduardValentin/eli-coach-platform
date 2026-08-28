import { expect, test } from "../support/fixtures";

test("a returning user signs in from Pricing and lands back on Pricing", async ({
  page,
  publicNav,
  accountPortal,
  testEmail,
  signUpNewAccount,
}) => {
  // arrange: create the account once via the UI, then sign out — the next
  // sign-in below is what exercises a genuinely returning user.
  await page.goto("/store");
  await signUpNewAccount();
  await publicNav.signOut();

  // act
  await page.goto("/pricing");
  await publicNav.signIn();
  await accountPortal.signInWithEmail(testEmail);
  await accountPortal.completeEmailOtp();

  // assert
  await expect(page).toHaveURL(/\/pricing$/);
  await publicNav.expectSignedIn();
});
