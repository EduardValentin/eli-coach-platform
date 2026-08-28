import { expect, test } from "../support/fixtures";

test("a signed-out visit to the client portal redirects through sign-in to the access-denied page", async ({
  page,
  accountPortal,
  testEmail,
}) => {
  // act: a signed-out visitor tries the client portal directly.
  await page.goto("/client");

  // assert: they land on the Account Portal, not the app — this app defines
  // no /client-guarded content for an anonymous visitor to see first.
  await expect(page).toHaveURL(/\.accounts\.dev\//);

  // act: create a fresh account and finish sign-in.
  await accountPortal.chooseSignUp();
  await accountPortal.signUpWithEmail(testEmail);
  await accountPortal.completeEmailOtp();

  // assert: back on /client, but denied — a brand-new account has no CLIENT
  // role yet, so the portal layout's guard throws the 403.
  await expect(page).toHaveURL(/\/client$/);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this page" }),
  ).toBeVisible();
  const backToStore = page.getByRole("link", { name: "Back to the Store" });
  await expect(backToStore).toBeVisible();

  // act
  await backToStore.click();

  // assert
  await expect(page).toHaveURL(/\/store$/);
});
