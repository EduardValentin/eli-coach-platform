import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type BellLine = string | RegExp;

const BELL_TITLE = "Notifications";
const BELL_TRIGGER = /^Notifications(, \d+ unread)?$/;
const MARK_ALL_READ = "Mark all read";
const EMPTY_BELL = "No notifications yet.";
const TOAST = "[data-sonner-toast]";
const MINUTE_CHECK_MS = 60_000;

export class NotificationBell {
  constructor(private readonly page: Page) {}

  private get trigger() {
    return this.page.getByRole("button", { name: BELL_TRIGGER });
  }

  private get panel() {
    return this.page.getByRole("dialog", { name: BELL_TITLE });
  }

  private get markAllReadButton() {
    return this.panel.getByRole("button", { name: MARK_ALL_READ });
  }

  private rowOf(title: string, line: BellLine): Locator {
    return this.panel
      .getByRole("link")
      .filter({ hasText: title })
      .filter({ hasText: line });
  }

  private toastOf(title: string): Locator {
    return this.page.locator(TOAST).filter({ hasText: title });
  }

  private unreadName(count: number): string {
    return count === 0 ? BELL_TITLE : `${BELL_TITLE}, ${count} unread`;
  }

  async installClock(): Promise<void> {
    await this.page.clock.install();
  }

  async waitForMinuteCheck(): Promise<void> {
    await this.page.clock.runFor(MINUTE_CHECK_MS);
  }

  async expectUnread(count: number): Promise<void> {
    await expect(this.trigger).toHaveAccessibleName(this.unreadName(count));
  }

  async open(): Promise<void> {
    await expect(async () => {
      if (!(await this.panel.isVisible())) {
        await this.trigger.click();
      }
      await expect(this.panel).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectRow(title: string, line: BellLine): Promise<void> {
    await expect(this.rowOf(title, line)).toBeVisible();
  }

  async openRow(title: string, line: BellLine): Promise<void> {
    await this.rowOf(title, line).click();
    await expect(this.panel).toBeHidden();
  }

  async markAllRead(): Promise<void> {
    await this.markAllReadButton.click();
    await expect(this.markAllReadButton).toBeHidden();
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.panel.getByText(EMPTY_BELL, { exact: true }),
    ).toBeVisible();
    await expect(this.panel.getByRole("link")).toHaveCount(0);
  }

  async expectToast(title: string): Promise<void> {
    await expect(this.toastOf(title)).toBeVisible();
  }

  async viewToast(title: string): Promise<void> {
    await this.toastOf(title).getByRole("button", { name: "View" }).click();
  }
}
