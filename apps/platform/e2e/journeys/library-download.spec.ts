import { stat } from "node:fs/promises";

import { expect, test } from "../support/fixtures";
import { expectHydrated } from "../support/hydration";
import { untaggedAddress } from "../support/store-ownership";

test("a visitor who signs up downloads the product she requested as a guest from her Library", async ({
  page,
  publicNav,
  signUpNewAccount,
  storeCatalog,
  storeOwnership,
  testEmail,
}) => {
  // arrange — a published product, acquired as a guest under the untagged form
  // of the address she is about to sign up with.
  const product = await storeCatalog.publishFixtureProduct();

  await storeOwnership.seedGuestAcquisition({
    normalizedEmail: untaggedAddress(testEmail),
    productId: product.id,
  });
  await page.goto("/store");
  await publicNav.expectSignedOut();

  // act — the real hosted Account Portal, then the Library from the nav, then
  // the row's own download. Opening the Library is the nav link's own
  // evidence: it is reachable only when the signed-in header renders it.
  await signUpNewAccount();
  await publicNav.openLibrary();

  const row = page.getByRole("listitem").filter({ hasText: product.title });
  const downloadButton = row.getByRole("button", {
    name: `Download ${product.title}`,
  });

  await expectHydrated(downloadButton);

  // Armed together with the click: the save starts as soon as the bytes
  // arrive, and an event Playwright was not yet listening for is one it never
  // sees.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadButton.click(),
  ]);

  // assert
  await expect(page).toHaveURL(/\/library$/);
  await expect(row.getByRole("heading", { level: 2 })).toHaveText(product.title);
  await expect(row.getByText("Free")).toBeVisible();
  expect(download.suggestedFilename()).toBe(product.customerFilename);

  const savedPath = await download.path();

  await expect(stat(savedPath).then((file) => file.size)).resolves.toBe(
    product.downloadByteLength,
  );
});
