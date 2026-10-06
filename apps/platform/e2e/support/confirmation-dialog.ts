import { expect, type Locator, type Page } from "@playwright/test";

import { isFocused } from "./keyboard";

const TRAP_PROBE_KEYS = [
  "Tab",
  "Tab",
  "Tab",
  "Tab",
  "Shift+Tab",
  "Shift+Tab",
  "Shift+Tab",
  "Shift+Tab",
] as const;

export type ConfirmationLabels = {
  title: string;
  confirm: string;
  dismiss: string;
};

export class ConfirmationDialog {
  private readonly dialog: Locator;

  constructor(
    private readonly page: Page,
    private readonly labels: ConfirmationLabels,
  ) {
    this.dialog = page.getByRole("dialog", { name: labels.title, exact: true });
  }

  async expectShownWithin(timeout: number): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout });
  }

  async expectOpen(body: string): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByText(body, { exact: true })).toBeVisible();
    await expect(
      this.dialog.getByRole("button", { name: this.labels.confirm }),
    ).toBeEnabled();
    await expect(
      this.dialog.getByRole("button", { name: this.labels.dismiss }),
    ).toBeEnabled();
  }

  async confirm(): Promise<void> {
    await this.dialog
      .getByRole("button", { name: this.labels.confirm, exact: true })
      .click();
  }

  async dismiss(): Promise<void> {
    await this.dialog
      .getByRole("button", { name: this.labels.dismiss, exact: true })
      .click();
    await expect(this.dialog).toBeHidden();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.dialog).toBeHidden();
  }

  async tabWithin(): Promise<void> {
    await this.page.keyboard.press("Tab");
    expect(await isFocused(this.dialog)).toBe(true);
  }

  async expectFocusTrapped(): Promise<void> {
    expect(await isFocused(this.dialog)).toBe(true);

    for (const key of TRAP_PROBE_KEYS) {
      await this.page.keyboard.press(key);
      expect(await isFocused(this.dialog)).toBe(true);
    }
  }

  async expectProblem(problem: string): Promise<void> {
    await expect(
      this.dialog.getByRole("alert").filter({ hasText: problem }),
    ).toBeVisible();
  }

  async expectNoProblem(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole("alert")).toHaveCount(0);
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }
}
