import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type PreferenceReadings = { checkInDay: string; channel: string };

type PreferenceRow = { title: string; reasonLabel: string };

const CHECK_IN_DAY_ROW: PreferenceRow = {
  title: "Check-in day",
  reasonLabel: "Why the check-in day can't be changed",
};

const CHANNEL_ROW: PreferenceRow = {
  title: "Channel",
  reasonLabel: "Why the channel can't be changed",
};

export class PreferenceRows {
  private readonly section: Locator;

  constructor(
    private readonly page: Page,
    title: string,
  ) {
    this.section = page.getByRole("region", { name: title, exact: true });
  }

  private reason(row: PreferenceRow): Locator {
    return this.section.getByRole("button", {
      name: row.reasonLabel,
      exact: true,
    });
  }

  private row(row: PreferenceRow): Locator {
    return this.section
      .locator("div")
      .filter({ has: this.page.getByText(row.title, { exact: true }) })
      .filter({
        has: this.page.getByRole("button", {
          name: row.reasonLabel,
          exact: true,
        }),
      })
      .last();
  }

  private async expectRow(row: PreferenceRow, value: string): Promise<void> {
    await expect(this.row(row).getByText(value, { exact: true })).toBeVisible();
    await expect(this.row(row).getByRole("textbox")).toHaveCount(0);
    await expect(this.row(row).getByRole("radio")).toHaveCount(0);
  }

  async expectReadings(readings: PreferenceReadings): Promise<void> {
    await this.expectRow(CHECK_IN_DAY_ROW, readings.checkInDay);
    await this.expectRow(CHANNEL_ROW, readings.channel);
  }

  async expectReason(text: string): Promise<void> {
    const reason = this.reason(CHECK_IN_DAY_ROW);

    await expect(async () => {
      await reason.hover();
      await expect(reason).toHaveAccessibleDescription(text, {
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectAbsent(): Promise<void> {
    await expect(this.section).toHaveCount(0);
  }
}
