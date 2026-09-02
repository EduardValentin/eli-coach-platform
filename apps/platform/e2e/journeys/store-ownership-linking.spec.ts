import { expect, test } from "../support/fixtures";
import { untaggedAddress } from "../support/store-ownership";

test("a visitor who signs up finds the resources she requested as a guest already hers", async ({
  clerkBackendClient,
  page,
  publicNav,
  signUpNewAccount,
  storeOwnership,
  testEmail,
}) => {
  // arrange — one acquisition she made before she had an account, recorded
  // under the untagged form of the address she is about to sign up with, and
  // one that belongs to somebody else.
  const herAddress = untaggedAddress(testEmail);
  const somebodyElse = herAddress.replace("@", "-other@");

  await storeOwnership.seedGuestAcquisition(herAddress);
  await storeOwnership.seedGuestAcquisition(somebodyElse);
  await page.goto("/store");
  await publicNav.expectSignedOut();

  expect(await storeOwnership.owningAuthSubjectId(herAddress)).toBeNull();

  // act — the real hosted Account Portal, returning to the Store.
  await signUpNewAccount();

  // assert
  await expect(page).toHaveURL(/\/store$/);
  // The signed-in nav is rendered from the layout loader's session, so
  // waiting for it is what proves this document was served to an
  // authenticated request — the same request whose catalog loader claims.
  await publicNav.expectSignedIn();

  const users = await clerkBackendClient.users.getUserList({
    emailAddress: [testEmail],
  });
  const signedInSubjectId = users.data[0]?.id;

  expect(signedInSubjectId).toBeDefined();
  expect(await storeOwnership.owningAuthSubjectId(herAddress)).toBe(
    signedInSubjectId,
  );
  expect(await storeOwnership.owningAuthSubjectId(somebodyElse)).toBeNull();

  // Coming back changes nothing: the claim only ever takes recipients no
  // account holds, so a second visit is not a second claim.
  await page.reload();
  await publicNav.expectSignedIn();

  expect(await storeOwnership.owningAuthSubjectId(herAddress)).toBe(
    signedInSubjectId,
  );
  expect(await storeOwnership.owningAuthSubjectId(somebodyElse)).toBeNull();
});
