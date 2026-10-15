import {
  expect,
  test,
  type ElementHandle,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";

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
const SHEET_FOOTER = '[data-parity="sheet-footer"]';
const CLASHES_COUNTING = '[data-parity="hour-clashes-loading"]';
const CLASHES_COUNTED = '[data-parity="hour-clashes"]';
const PREVIEW_PATH = "/api/check-ins/series/preview";

type DialogGeometry = { height: number; footerY: number };

type WeekdaySwitch = {
  day: string;
  counting: DialogGeometry;
  counted: DialogGeometry;
};

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

  private readonly heldPreviews: Array<() => void> = [];

  private readonly isPreview = (url: URL): boolean =>
    url.pathname.startsWith(PREVIEW_PATH);

  private readonly holdPreview = async (route: Route): Promise<void> => {
    await new Promise<void>((release) => this.heldPreviews.push(release));
    await route.continue();
  };

  private async geometry(): Promise<DialogGeometry> {
    const dialog = await this.dialog.boundingBox();
    const footer = await this.dialog.locator(SHEET_FOOTER).boundingBox();

    if (!dialog || !footer) {
      throw new Error("The weekly check-in dialog is not laid out.");
    }

    return { height: dialog.height, footerY: footer.y };
  }

  private async releaseHeldPreview(): Promise<void> {
    await expect.poll(() => this.heldPreviews.length).toBe(1);
    this.heldPreviews.shift()?.();
  }

  private async expectHourHeld(
    hour: string,
    mounted: ElementHandle,
  ): Promise<void> {
    await expect(this.hour(hour)).toHaveAttribute("aria-pressed", "true");
    expect(
      await mounted.evaluate((button) => button.isConnected),
      "the chosen hour stays the same mounted button",
    ).toBe(true);
  }

  private async switchWeekdayHoldingHour(
    day: string,
    hour: string,
  ): Promise<WeekdaySwitch> {
    const mounted = await this.hour(hour).elementHandle();
    const offeredHours = await this.hours.getByRole("button").count();
    const previewed = this.page.waitForResponse((response) =>
      this.isPreview(new URL(response.url())),
    );

    await this.weekday(day).click();
    await expect(this.hours).toHaveAttribute("aria-busy", "true");
    await expect(this.hours.locator(CLASHES_COUNTING)).toHaveCount(
      offeredHours,
    );
    await expect(this.hours.locator(CLASHES_COUNTING).first()).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(this.hours.locator(CLASHES_COUNTED)).toHaveCount(0);
    await this.expectHourHeld(hour, mounted!);
    const counting = await this.geometry();

    await this.releaseHeldPreview();
    await (await previewed).finished();
    await expect(this.hours).not.toHaveAttribute("aria-busy");
    await expect(this.hours.locator(CLASHES_COUNTING)).toHaveCount(0);
    await expect(this.weekday(day)).toBeChecked();
    await this.expectHourHeld(hour, mounted!);

    return { day, counting, counted: await this.geometry() };
  }

  async expectHoursHold(
    hour: string,
    weekdays: readonly string[],
  ): Promise<void> {
    const before = await this.geometry();
    const switches: WeekdaySwitch[] = [];

    await this.page.route(this.isPreview, this.holdPreview);
    try {
      for (const day of weekdays) {
        switches.push(await this.switchWeekdayHoldingHour(day, hour));
      }
    } finally {
      await this.page.unroute(this.isPreview, this.holdPreview);
    }

    test.info().annotations.push({
      type: "weekly-dialog-geometry",
      description: JSON.stringify({ before, switches }),
    });
    for (const { counting, counted } of switches) {
      expect(counting).toEqual(before);
      expect(counted).toEqual(before);
    }
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

  async expectHourPreselected(hour: string): Promise<void> {
    await expect(this.hour(hour)).toHaveAttribute("aria-pressed", "true");
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
