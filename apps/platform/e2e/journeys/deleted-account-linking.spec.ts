import { expect, test } from "../support/fixtures";
import { untaggedAddress } from "../support/store-ownership";

// Two hosted sign-ups and a real webhook delivery, where the others do one
// sign-up and no waiting.
test.setTimeout(240_000);

test("a deleted account keeps what it owned, and the next account on that address inherits nothing", async ({
  clerkBackendClient,
  page,
  publicNav,
  signUpNewAccount,
  storeOwnership,
  testEmail,
}) => {
  // arrange — an acquisition made as a guest, claimed on her first visit.
  const herAddress = untaggedAddress(testEmail);

  await storeOwnership.seedGuestAcquisition(herAddress);
  await page.goto("/store");
  await publicNav.expectSignedOut();
  await signUpNewAccount();
  await publicNav.expectSignedIn();

  const firstSubjectId = await subjectIdFor(testEmail);

  expect(await storeOwnership.owningAuthSubjectId(herAddress)).toBe(
    firstSubjectId,
  );

  // act — deleted as a privacy request deletes it, with Clerk delivering
  // `user.deleted` through the relay. The account is detached, not erased.
  await clerkBackendClient.users.deleteUser(firstSubjectId);

  await expect
    .poll(() => storeOwnership.accountDeletedAt(firstSubjectId), {
      intervals: [500, 1_000, 2_000],
      message:
        "The app never recorded user.deleted. Is the Clerk webhook relay " +
        "forwarding to this dev server, and does " +
        "CLERK_WEBHOOK_SIGNING_SECRET match the Dashboard endpoint " +
        "registered against its inbox? See docs/CLERK.md's E2E lane.",
      timeout: 60_000,
    })
    .not.toBeNull();

  // A new identity on the same address, from a clean browser: what her old
  // cookie does now is indeterminate — it may still verify and bounce this
  // visit through the failure page, or be inert.
  await page.context().clearCookies();
  await page.goto("/store");
  await publicNav.expectSignedOut();
  await signUpNewAccount();
  await publicNav.expectSignedIn();

  // assert
  const secondSubjectId = await subjectIdFor(testEmail);

  expect(secondSubjectId).not.toBe(firstSubjectId);
  expect(await storeOwnership.owningAuthSubjectId(herAddress)).toBe(
    firstSubjectId,
  );

  async function subjectIdFor(emailAddress: string): Promise<string> {
    const users = await clerkBackendClient.users.getUserList({
      emailAddress: [emailAddress],
    });
    const subjectId = users.data[0]?.id;

    if (!subjectId) {
      throw new Error(`No Clerk user holds ${emailAddress}.`);
    }

    return subjectId;
  }
});
