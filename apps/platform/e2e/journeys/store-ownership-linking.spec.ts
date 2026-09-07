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
  // arrange — one acquisition under the untagged form of the address she is
  // about to sign up with, and one belonging to somebody else.
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
  // The signed-in nav comes from the layout loader, so waiting for it proves
  // this document was served to the authenticated request that claims.
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
});
