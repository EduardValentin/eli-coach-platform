import { expect, test } from "../support/fixtures";

test("a Clerk user nobody provisioned is signed out again and told sign-in failed", async ({
  page,
  publicNav,
  createClerkUser,
  signIn,
}) => {
  // arrange: an identity exists at Clerk, but no account was ever created for it.
  await createClerkUser();
  await page.goto("/store");
  await publicNav.expectSignedOut();

  // act
  await signIn();

  // assert
  await expect(page).toHaveURL(/\/sign-in-failed$/);
  await expect(
    page.getByRole("heading", { name: "We couldn't finish signing you in" }),
  ).toBeVisible();
  await publicNav.expectSignedOut();
});
