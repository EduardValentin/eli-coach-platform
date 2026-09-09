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
  // arrange
  const product = await storeCatalog.publishFixtureProduct();

  await storeOwnership.seedGuestAcquisition({
    normalizedEmail: untaggedAddress(testEmail),
    productId: product.id,
  });
  await page.goto("/store");
  await publicNav.expectSignedOut();

  // act
  await signUpNewAccount();
  await publicNav.openLibrary();

  const row = page.getByRole("listitem").filter({ hasText: product.title });
  const downloadButton = row.getByRole("button", {
    name: `Download ${product.title}`,
  });

  await expectHydrated(downloadButton);

  // Playwright never sees an event it was not already listening for.
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
