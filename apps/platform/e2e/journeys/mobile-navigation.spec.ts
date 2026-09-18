import { expect, test } from "../support/fixtures";

test("a coach can use the mobile portal navigation", async ({
  page,
  provisionAccount,
  publicNav,
  signIn,
}) => {
  // arrange
  await provisionAccount("COACH");
  await page.goto("/store");
  await signIn();
  await publicNav.openPortal("COACH");
  await page.setViewportSize({ height: 844, width: 390 });
  const menuTrigger = page.getByRole("button", { name: "Open menu" });

  // act
  await menuTrigger.click();

  // assert
  const closeMenuButton = page.getByRole("button", { name: "Close menu" });
  await expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");
  const dialog = page.getByRole("dialog", {
    name: "Coach portal mobile navigation",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Dashboard" })).toBeFocused();

  // act
  await page.keyboard.press("Escape");

  // assert
  await expect(dialog).toBeHidden();
  await expect(menuTrigger).toBeFocused();
});
