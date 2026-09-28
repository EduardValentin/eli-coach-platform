import { devices } from "@playwright/test";

import { expect, test } from "../support/fixtures";

test("a client finds her way around her portal on a laptop and on her phone", async ({
  page,
  clientPortalShell,
  provisionAccount,
  publicNav,
  signIn,
}) => {
  // arrange
  await provisionAccount("CLIENT");
  await page.goto("/store");
  await signIn();

  // act
  await publicNav.openPortal("CLIENT");

  // assert
  await expect(page).toHaveURL(/\/client$/);
  await clientPortalShell.expectSidebar("Client");
  await clientPortalShell.expectDashboardCurrent();
  await clientPortalShell.expectGreeting("Welcome back.");

  // act
  await clientPortalShell.skipToMainContent();

  // assert
  await clientPortalShell.expectMainContentFocused();

  // act
  await clientPortalShell.usePhoneViewport();

  // assert
  await clientPortalShell.expectTopBar("Client");
  await clientPortalShell.expectTabBar();
  await clientPortalShell.expectDashboardCurrent();

  // act
  await clientPortalShell.openMore();

  // assert
  await clientPortalShell.expectSheetOpen();

  // act
  await clientPortalShell.closeSheetWithEscape();

  // assert
  await clientPortalShell.expectSheetClosedWithFocusOnMore();

  // act
  await clientPortalShell.openMore();
  await clientPortalShell.signOutFromSheet();

  // assert
  await expect(page).toHaveURL("/");
  await page.setViewportSize(devices["Desktop Chrome"].viewport);
  await publicNav.expectSignedOut();
});
