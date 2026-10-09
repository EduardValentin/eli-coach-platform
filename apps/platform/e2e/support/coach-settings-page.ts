import { expect, type Page } from "@playwright/test";

const SETTINGS_PATH = "/coach/settings";
const SECTION_TITLE = "Calls and check-ins";
const SECTION_LINES = [
  "Visitors book calls and clients pick check-in times inside the days and hours you set here.",
  "Calls and check-ins can be booked on these days.",
] as const;
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

  async expectNoMeetingLinkWarning(): Promise<void> {
    await expect(
      this.page.getByText(NO_LINK_WARNING, { exact: true }),
    ).toBeVisible();
  }
}
