import { expect, test } from "../support/fixtures";
import { untaggedAddress } from "../support/store-ownership";

// Two hosted Account Portal sign-ups and a wait for a real webhook delivery,
// where every other journey does one sign-up and no waiting.
test.setTimeout(240_000);

test("a deleted account keeps what it owned, and the next account on that address inherits nothing", async ({
  clerkBackendClient,
  page,
  publicNav,
  signUpNewAccount,
  storeOwnership,
  testEmail,
}) => {
  // arrange — an acquisition she made as a guest, and an account that claims
  // it on her first visit to the Store.
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

  // act — the identity is deleted the way a privacy request deletes it, and
  // Clerk delivers `user.deleted` through the relay to the running app. The
  // account is detached from the identity, not erased, so what it owns stays
  // owned.
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

  // She comes back later and signs up again on the same address — a new
  // identity, and so a new account. The browser starts clean: her old
  // session died with the identity, and carrying its cookie in would only
  // bounce this visit through the failure page on the way.
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
