import { expect, type Locator, type Page } from "@playwright/test";

export type NavigationMark = "marked" | "unmarked";

const RESOURCES = "Resources";
const MORE = "More";
const ANY_RESOURCES_LINK = /^Resources( \(new\))?$/;

export class ClientPortalShell {
  constructor(private readonly page: Page) {}

  private static markedName(name: string, mark: NavigationMark): string {
    return mark === "marked" ? `${name} (new)` : name;
  }

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

  private get sidebarNavigation() {
    return this.sidebar.getByRole("navigation", {
      name: "Client portal navigation",
    });
  }

  private profileLinkIn(scope: Locator): Locator {
    return scope.getByRole("link", { name: "Profile", exact: true });
  }

  private settingsLinkIn(scope: Locator): Locator {
    return scope.getByRole("link", { name: "Settings", exact: true });
  }

  private resourcesLinkIn(scope: Locator): Locator {
    return scope.getByRole("link", { name: ANY_RESOURCES_LINK });
  }

  private nameLinkIn(scope: Locator, displayName: string): Locator {
    return scope.getByRole("link", { name: displayName, exact: true });
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

  async expectProfileCurrent(): Promise<void> {
    await expect(
      this.page.getByRole("link", { name: "Profile", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }

  async openProfileFromSidebar(): Promise<void> {
    await this.profileLinkIn(this.sidebarNavigation).click();
  }

  async openProfileFromTabs(): Promise<void> {
    await this.profileLinkIn(this.tabBar).click();
  }

  async openSettingsFromSidebar(): Promise<void> {
    await this.settingsLinkIn(this.sidebarNavigation).click();
  }

  async openSettingsFromMoreSheet(): Promise<void> {
    await this.openMore();
    await this.expectSheetOpen();
    await this.settingsLinkIn(this.moreSheet).click();
    await expect(this.moreSheet).toBeHidden();
  }

  async openResourcesFromSidebar(): Promise<void> {
    await this.resourcesLinkIn(this.sidebarNavigation).click();
  }

  async openResourcesFromOpenMoreSheet(): Promise<void> {
    await this.resourcesLinkIn(this.moreSheet).click();
    await expect(this.moreSheet).toBeHidden();
  }

  async expectResourcesCurrent(): Promise<void> {
    await expect(this.resourcesLinkIn(this.sidebarNavigation)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }

  async expectSidebarResources(mark: NavigationMark): Promise<void> {
    await expect(
      this.resourcesLinkIn(this.sidebarNavigation),
    ).toHaveAccessibleName(ClientPortalShell.markedName(RESOURCES, mark));
  }

  async expectMoreButton(mark: NavigationMark): Promise<void> {
    await expect(this.moreButton).toHaveAccessibleName(
      ClientPortalShell.markedName(MORE, mark),
    );
  }

  async expectSheetResources(mark: NavigationMark): Promise<void> {
    await expect(this.resourcesLinkIn(this.moreSheet)).toHaveAccessibleName(
      ClientPortalShell.markedName(RESOURCES, mark),
    );
  }

  async expectSettingsCurrent(): Promise<void> {
    await expect(
      this.page.getByRole("link", { name: "Settings", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }

  async openProfileFromSidebarName(displayName: string): Promise<void> {
    await this.nameLinkIn(this.sidebar, displayName).click();
  }

  async openProfileFromTopBarName(displayName: string): Promise<void> {
    await this.nameLinkIn(this.topBar, displayName).click();
  }

  async openProfileFromMoreSheetName(displayName: string): Promise<void> {
    await this.nameLinkIn(this.moreSheet, displayName).click();
  }

  async expectSheetClosed(): Promise<void> {
    await expect(this.moreSheet).toBeHidden();
  }

  async expectGreeting(greeting: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { level: 1, name: greeting }),
    ).toBeVisible();
  }

  async tabToSkipLink(): Promise<void> {
    await this.page.keyboard.press("Tab");
  }

  async expectSkipLinkFocused(): Promise<void> {
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

  async expectTabLinks(names: readonly string[]): Promise<void> {
    await expect(this.tabBar.getByRole("link")).toHaveText([...names]);
  }

  async expectSidebarLinks(names: readonly string[]): Promise<void> {
    await expect(this.sidebarNavigation.getByRole("link")).toHaveText([
      ...names,
    ]);
  }

  async openCheckInsFromSidebar(): Promise<void> {
    await this.sidebarNavigation
      .getByRole("link", { name: "Check-ins" })
      .click();
  }

  async openCheckInsFromTabs(): Promise<void> {
    await this.tabBar.getByRole("link", { name: "Check-ins" }).click();
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
