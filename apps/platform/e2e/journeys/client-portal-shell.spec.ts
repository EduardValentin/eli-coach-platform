import { expect, test } from "../support/fixtures";
import { useDesktopViewport, usePhoneViewport } from "../support/viewport";

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
  await clientPortalShell.expectSkipLinkFocusedAfterTab();

  // act
  await clientPortalShell.followSkipLink();

  // assert
  await clientPortalShell.expectMainContentFocused();

  // act
  await usePhoneViewport(page);

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

  // act
  await useDesktopViewport(page);

  // assert
  await publicNav.expectSignedOut();
});
