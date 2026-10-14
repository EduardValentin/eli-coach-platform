import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { escapedPattern } from "./locator-text";

export type WeeklyDialogMode = "set-up" | "change";

const TITLES: Record<WeeklyDialogMode, RegExp> = {
  "set-up": /^Set up a weekly check-in with \S+$/,
  change: /^Change the weekly check-in$/,
};
export const WEEKLY_DIALOG_TITLE = new RegExp(
  Object.values(TITLES)
    .map((title) => title.source)
    .join("|"),
);
const SAVE_BUTTON = /^(Set up|Change)$/;
const SHEET_HANDLE = '[data-parity="sheet-handle"]';

export class WeeklyCheckInDialog {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page.getByRole("dialog", { name: WEEKLY_DIALOG_TITLE });
  }

  private get hours() {
    return this.dialog.getByRole("list", { name: "Hour" });
  }

  private get saveButton() {
    return this.dialog.getByRole("button", { name: SAVE_BUTTON });
  }

  private weekday(day: string): Locator {
    return this.dialog
      .getByRole("radiogroup", { name: "Day" })
      .getByRole("radio", { name: day, exact: true });
  }

  private hour(hour: string): Locator {
    return this.hours.getByRole("button", {
      name: new RegExp(`^${escapedPattern(hour)}( |$)`),
    });
  }

  async expectOpen(mode: WeeklyDialogMode): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole("heading", { level: 3, name: TITLES[mode] }),
    ).toBeFocused();
    await expect(this.hours).toBeVisible();
  }

  async expectOpenAsSheet(mode: WeeklyDialogMode): Promise<void> {
    await this.expectOpen(mode);
    await expect(this.dialog.locator(SHEET_HANDLE)).toBeVisible();
    await expect
      .poll(async () => {
        const box = await this.dialog.boundingBox();
        const viewport = this.page.viewportSize();

        return box && viewport
          ? Math.round(viewport.height - (box.y + box.height))
          : null;
      })
      .toBe(0);
  }

  async expectWeekdayPreselected(day: string): Promise<void> {
    await expect(this.weekday(day)).toBeChecked();
  }

  async chooseWeekday(day: string): Promise<void> {
    const weekday = `weekday=${day.toLowerCase()}`;
    const previewed = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/check-ins/series/preview") &&
        response.url().includes(weekday),
    );
    await this.weekday(day).click();
    await (await previewed).finished();
    await expect(this.weekday(day)).toBeChecked();
    await expect(this.hours).toBeVisible();
  }

  async expectClashes(hour: string, clashes: number): Promise<void> {
    const count = clashes === 1 ? "1 clash" : `${clashes} clashes`;

    await expect(
      this.hours.getByRole("button", { name: `${hour} ${count}`, exact: true }),
    ).toBeVisible();
  }

  async expectNoClash(hour: string): Promise<void> {
    await expect(
      this.hours.getByRole("button", { name: hour, exact: true }),
    ).toBeVisible();
  }

  async chooseHour(hour: string): Promise<void> {
    await this.hour(hour).click();
    await expect(this.hour(hour)).toHaveAttribute("aria-pressed", "true");
  }

  async chooseHourByKeyboard(hour: string): Promise<void> {
    await tabTo(this.page, this.hour(hour));
    await this.page.keyboard.press("Enter");
    await expect(this.hour(hour)).toHaveAttribute("aria-pressed", "true");
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async saveByKeyboard(): Promise<void> {
    await tabTo(this.page, this.saveButton);
    await this.page.keyboard.press("Enter");
    await expect(this.dialog).toBeHidden();
  }
}
