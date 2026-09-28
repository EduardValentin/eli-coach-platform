import { expect, type Page } from "@playwright/test";

export class ClientPortalShell {
  constructor(private readonly page: Page) {}

  private get sidebar() {
    return this.page.getByRole("complementary", {
      name: "Client portal sidebar",
    });
  }

  private get topBar() {
    return this.page.getByRole("banner", { name: "Client portal top bar" });
  }

  private get tabBar() {
    return this.page.getByRole("navigation", { name: "Client portal tabs" });
  }

  private get moreButton() {
    return this.tabBar.getByRole("button", { name: "More" });
  }

  private get moreSheet() {
    return this.page.getByRole("dialog", { name: "More" });
  }

  private get skipLink() {
    return this.page.getByRole("link", { name: "Skip to main content" });
  }

  async expectSidebar(displayName: string): Promise<void> {
    await expect(this.sidebar).toBeVisible();
    await expect(
      this.sidebar.getByText(displayName, { exact: true }),
    ).toBeVisible();
    await expect(
      this.sidebar.getByRole("navigation", {
        name: "Client portal navigation",
      }),
    ).toBeVisible();
  }

  async expectDashboardCurrent(): Promise<void> {
    await expect(
      this.page.getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
  }

  async expectGreeting(greeting: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { level: 1, name: greeting }),
    ).toBeVisible();
  }

  async expectSkipLinkFocusedAfterTab(): Promise<void> {
    await this.page.keyboard.press("Tab");
    await expect(this.skipLink).toBeFocused();
  }

  async followSkipLink(): Promise<void> {
    await this.page.keyboard.press("Enter");
  }

  async expectMainContentFocused(): Promise<void> {
    await expect(this.page.getByRole("main")).toBeFocused();
  }

  async expectTopBar(displayName: string): Promise<void> {
    await expect(this.topBar).toBeVisible();
    await expect(
      this.topBar.getByText(displayName, { exact: true }),
    ).toBeVisible();
  }

  async expectTabBar(): Promise<void> {
    await expect(this.tabBar).toBeVisible();
    await expect(
      this.tabBar.getByRole("link", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(this.moreButton).toHaveAttribute("aria-expanded", "false");
  }

  async openMore(): Promise<void> {
    await this.moreButton.click();
  }

  async expectSheetOpen(): Promise<void> {
    await expect(this.moreSheet).toBeVisible();
    await expect(
      this.moreSheet.getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  }

  async closeSheetWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async expectSheetClosedWithFocusOnMore(): Promise<void> {
    await expect(this.moreSheet).toBeHidden();
    await expect(this.moreButton).toBeFocused();
  }

  async signOutFromSheet(): Promise<void> {
    await this.moreSheet.getByRole("button", { name: "Sign out" }).click();
  }
}
