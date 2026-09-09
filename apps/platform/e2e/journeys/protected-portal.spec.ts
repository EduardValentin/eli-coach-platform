import { expect, test } from "../support/fixtures";

test("a coach who lands on the client portal is denied and sent to the coach portal", async ({
  page,
  accountPortal,
  provisionAccount,
  testEmail,
}) => {
  // arrange: the coach, who has no business in the client portal.
  await provisionAccount("COACH");

  // act: a signed-out visitor tries the client portal directly.
  await page.goto("/client");

  // assert: they land on the Account Portal, not the app — this app defines
  // no /client-guarded content for an anonymous visitor to see first.
  await accountPortal.expectEmailStepVisible();

  // act: finish sign-in as the coach.
  await accountPortal.signInWithEmail(testEmail);
  await accountPortal.completeEmailOtp();

  // assert: back on /client, but denied, with the coach's own portal as the
  // way out.
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
