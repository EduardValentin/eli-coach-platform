import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { addMeasurementsSheetOn } from "./measurements-sheet";
import {
  MeasurementsHistory,
  type MeasurementRowReadings,
} from "./measurements-history";

const PROFILE_PATH = "/client/profile";
const CLIENT_COLUMNS = ["Date", "Weight", "Waist", "Hips", "Thigh", "Arm"];
const EMPTY_HISTORY =
  "Nothing recorded yet. Your first set goes in with your answers.";

export const CADENCE_HINT =
  /\b(weekly|monthly|fortnight\w*|once a (week|month)|every (week|month|\d+)|\d+\s*(days?|weeks?)|weeks?|months?)\b/i;

export class ClientProfilePage {
  private readonly measurementsHistory: MeasurementsHistory;

  constructor(private readonly page: Page) {
    this.measurementsHistory = new MeasurementsHistory(page);
  }

  private get measurements() {
    return this.page.getByRole("region", { name: "Measurements", exact: true });
  }

  private async openSheetWith(trigger: Locator): Promise<void> {
    const sheet = addMeasurementsSheetOn(this.page);

    await expect(async () => {
      await trigger.click();
      await expect(sheet).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
  }

  async open(): Promise<void> {
    await this.page.goto(PROFILE_PATH);
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${PROFILE_PATH}$`));
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Your Profile" }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        "Your coach keeps this up to date. Mention any changes at your next check-in.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      this.page.getByRole("main").getByRole("heading", { level: 2 }),
    ).toHaveText(["Measurements"]);
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.measurements.getByText(EMPTY_HISTORY, { exact: true }),
    ).toBeVisible();
    await expect(
      this.measurements.getByRole("button", {
        name: "Add your first measurements",
      }),
    ).toBeVisible();
    await expect(this.measurements.getByRole("table")).toHaveCount(0);
  }

  async expectHistory(rows: readonly MeasurementRowReadings[]): Promise<void> {
    await this.measurementsHistory.expectColumns(CLIENT_COLUMNS);
    await this.measurementsHistory.expectNoColumn("Ratio");
    await this.measurementsHistory.expectRows(rows);
  }

  async expectAccessibleHistory(): Promise<void> {
    await this.measurementsHistory.expectCaptionAndColumnHeaders(
      CLIENT_COLUMNS,
    );
  }

  async expectNoThumbnails(): Promise<void> {
    await this.measurementsHistory.expectNoThumbnails();
  }

  async expectNoCadenceHint(): Promise<void> {
    await expect(this.measurements).not.toContainText(CADENCE_HINT);
  }

  async expectViewPhotos(date: string): Promise<void> {
    await this.measurementsHistory.expectViewPhotos(date);
  }

  async expectNoViewPhotos(date: string): Promise<void> {
    await this.measurementsHistory.expectNoViewPhotos(date);
  }

  async openAdd(): Promise<void> {
    await this.openSheetWith(
      this.measurements.getByRole("button", { name: "Add", exact: true }),
    );
  }

  async openAddFirst(): Promise<void> {
    await this.openSheetWith(
      this.measurements.getByRole("button", {
        name: "Add your first measurements",
      }),
    );
  }
}
