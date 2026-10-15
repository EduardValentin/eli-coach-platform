import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

type BellLine = string | RegExp;
type BellPortal = "Client" | "Coach";

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

  private get rows() {
    return this.panel.getByRole("link");
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

  private triggerIn(region: Locator): Locator {
    return region.getByRole("button", { name: BELL_TRIGGER });
  }

  async expectInSidebar(portal: BellPortal): Promise<void> {
    await expect(
      this.triggerIn(
        this.page.getByRole("complementary", {
          name: `${portal} portal sidebar`,
        }),
      ),
    ).toBeVisible();
  }

  async expectInTopBar(portal: BellPortal): Promise<void> {
    await expect(
      this.triggerIn(
        this.page.getByRole("banner", { name: `${portal} portal top bar` }),
      ),
    ).toBeVisible();
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

  async openByKeyboard(): Promise<void> {
    await expect(async () => {
      await tabTo(this.page, this.trigger);
      await this.page.keyboard.press("Enter");
      await expect(this.panel).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.panel).toBeHidden();
  }

  async expectTriggerFocused(): Promise<void> {
    await expect(this.trigger).toBeFocused();
  }

  async expectOpenAsSheet(): Promise<void> {
    await expect(this.panel).toBeVisible();
    await expect
      .poll(async () => {
        const box = await this.panel.boundingBox();
        const viewport = this.page.viewportSize();

        return box && viewport
          ? {
              bottomGap: Math.round(viewport.height - (box.y + box.height)),
              fullWidth: Math.round(box.width) === viewport.width,
            }
          : null;
      })
      .toEqual({ bottomGap: 0, fullWidth: true });
  }

  async expectRowsInOrder(titles: readonly string[]): Promise<void> {
    await expect(this.rows).toHaveCount(titles.length);
    for (const [position, title] of titles.entries()) {
      await expect(this.rows.nth(position)).toContainText(title);
    }
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  async expectNoRowTitled(title: string): Promise<void> {
    await expect(this.rows.filter({ hasText: title })).toHaveCount(0);
  }

  async expectRowTitledOnce(title: string): Promise<void> {
    await expect(this.rows.filter({ hasText: title })).toHaveCount(1);
  }

  async expectRowUnread(
    title: string,
    line: BellLine,
    unread: boolean,
  ): Promise<void> {
    const row = this.rowOf(title, line);

    if (unread) {
      await expect(row).toContainText("Unread:");
      return;
    }
    await expect(row).not.toContainText("Unread:");
  }

  async expectRowAge(
    title: string,
    line: BellLine,
    age: RegExp,
  ): Promise<void> {
    await expect(this.rowOf(title, line)).toContainText(age);
  }

  async openRowByKeyboard(title: string, line: BellLine): Promise<void> {
    await tabTo(this.page, this.rowOf(title, line));
    await this.page.keyboard.press("Enter");
    await expect(this.panel).toBeHidden();
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

  async viewToastByKeyboard(title: string): Promise<void> {
    await tabTo(
      this.page,
      this.toastOf(title).getByRole("button", { name: "View" }),
    );
    await this.page.keyboard.press("Enter");
  }

  async viewToast(title: string): Promise<void> {
    await this.toastOf(title).getByRole("button", { name: "View" }).click();
  }
}
