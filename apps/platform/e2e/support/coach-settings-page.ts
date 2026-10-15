import { expect, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const SETTINGS_PATH = "/coach/settings";
const SECTION_TITLE = "Calls and check-ins";
const SECTION_LINES = [
  "Visitors book calls and clients pick check-in times inside the days and hours you set here.",
  "Calls and check-ins can be booked on these days.",
] as const;
const SAVED_TOAST = "Settings saved";
const NO_LINK_WARNING =
  "No one can join calls or check-ins until a link is set.";

export class CoachSettingsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(SETTINGS_PATH);
  }

  async expectAvailabilityCoversCheckIns(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: SECTION_TITLE }),
    ).toBeVisible();
    for (const line of SECTION_LINES) {
      await expect(this.page.getByText(line, { exact: true })).toBeVisible();
    }
  }

  async closeDay(day: string): Promise<void> {
    const chip = this.page.getByRole("checkbox", { name: day, exact: true });

    await expect(async () => {
      await chip.setChecked(false);
      await expect(chip).not.toBeChecked({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async save(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      this.page.getByText(SAVED_TOAST, { exact: true }),
    ).toBeVisible();
  }

  async expectNoMeetingLinkWarning(): Promise<void> {
    await expect(
      this.page.getByText(NO_LINK_WARNING, { exact: true }),
    ).toBeVisible();
  }
}
