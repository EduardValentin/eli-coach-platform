import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";

export type DashboardGreeting = { calls: number; checkIns: number };

const DASHBOARD_PATH = "/coach";

export class CoachDashboardPage {
  constructor(private readonly page: Page) {}

  private get pendingCheckIns() {
    return this.page.getByRole("region", { name: "Pending Check-ins" });
  }

  private get pendingRows() {
    return this.pendingCheckIns.getByRole("listitem");
  }

  private pendingRowOf(clientName: string): Locator {
    return this.pendingRows.filter({ hasText: clientName });
  }

  private counted(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
  }

  async open(): Promise<void> {
    await this.page.goto(DASHBOARD_PATH);
    await this.expectOpen();
  }

  async openFromNavigation(): Promise<void> {
    await this.page
      .getByRole("navigation", { name: "Coach portal navigation" })
      .getByRole("link", { name: "Dashboard" })
      .click();
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(DASHBOARD_PATH);
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: "Good morning, Coach.",
      }),
    ).toBeVisible();
  }

  async expectGreeting({ calls, checkIns }: DashboardGreeting): Promise<void> {
    await expect(
      this.page.getByText(
        `You have ${this.counted(calls, "assessment call")} today. ${this.counted(checkIns, "check-in")} to review.`,
        { exact: true },
      ),
    ).toBeVisible();
  }

  async expectPendingCheckIns(clientNames: readonly string[]): Promise<void> {
    await expect(this.pendingRows).toHaveCount(clientNames.length);
    for (const [position, clientName] of clientNames.entries()) {
      const row = this.pendingRows.nth(position);

      await expect(row).toContainText(clientName);
      await expect(row.getByRole("link", { name: "Review" })).toBeVisible();
    }
  }

  async expectNoPendingCheckIns(): Promise<void> {
    await expect(
      this.pendingCheckIns.getByText("No pending check-ins.", { exact: true }),
    ).toBeVisible();
    await expect(this.pendingRows).toHaveCount(0);
  }

  async expectPendingCheckInsAt(shownTimes: readonly RegExp[]): Promise<void> {
    await expect(this.pendingRows).toHaveCount(shownTimes.length);
    for (const [position, shownTime] of shownTimes.entries()) {
      await expect(this.pendingRows.nth(position)).toContainText(shownTime);
    }
  }

  async reviewByKeyboard(clientName: string): Promise<void> {
    await tabTo(
      this.page,
      this.pendingRowOf(clientName).getByRole("link", { name: "Review" }),
    );
    await this.page.keyboard.press("Enter");
  }

  async review(clientName: string): Promise<void> {
    await this.pendingRowOf(clientName)
      .getByRole("link", { name: "Review" })
      .click();
  }

  async viewAllCheckIns(): Promise<void> {
    await this.pendingCheckIns
      .getByRole("link", { name: "View all check-ins" })
      .click();
  }
}
