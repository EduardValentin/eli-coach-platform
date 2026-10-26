import { expect, type Locator, type Page } from "@playwright/test";

import { AvatarCard } from "./avatar-card";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { addMeasurementsSheetOn } from "./measurements-sheet";
import {
  MeasurementsHistory,
  type MeasurementRowReadings,
} from "./measurements-history";
import { ProfileFormSection } from "./profile-form-section";

export type CoachFactReadings = Readonly<Record<string, string>>;

const PROFILE_PATH = "/client/profile";
const CLIENT_COLUMNS = ["Date", "Weight", "Waist", "Hips", "Thigh", "Arm"];
const EMPTY_HISTORY =
  "Nothing recorded yet. Your first set goes in with your answers.";

export const CADENCE_HINT =
  /\b(weekly|monthly|fortnight\w*|once a (week|month)|every (week|month|\d+)|\d+\s*(days?|weeks?)|weeks?|months?)\b/i;

const PROFILE_SUBTITLE =
  "Keep your details up to date so your coach plans with the right facts.";
const COACH_FACTS_HEADING = "Your coach keeps these up to date";

export class ClientProfilePage {
  readonly aboutYou: ProfileFormSection;
  readonly training: ProfileFormSection;
  private readonly measurementsHistory: MeasurementsHistory;

  constructor(private readonly page: Page) {
    this.aboutYou = new ProfileFormSection(page, "About you");
    this.training = new ProfileFormSection(page, "Your training");
    this.measurementsHistory = new MeasurementsHistory(page);
  }

  private get coachFacts() {
    return this.page.getByRole("region", {
      name: COACH_FACTS_HEADING,
      exact: true,
    });
  }

  private coachFact(term: string): Locator {
    return this.coachFacts
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${escapedPattern(term)}$`) })
      .locator("xpath=following-sibling::dd[1]");
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

  avatar(fullName: string): AvatarCard {
    return new AvatarCard(this.page, fullName);
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
      this.page.getByText(PROFILE_SUBTITLE, { exact: true }),
    ).toBeVisible();
    await expect(this.measurements).toBeVisible();
  }

  async expectCoachFacts(readings: CoachFactReadings): Promise<void> {
    for (const [term, value] of Object.entries(readings)) {
      await expect(this.coachFact(term)).toHaveText(value);
    }
    await expect(this.coachFacts.getByRole("textbox")).toHaveCount(0);
    await expect(this.coachFacts.getByRole("button")).toHaveCount(0);
  }

  async expectNoCoachFacts(): Promise<void> {
    await expect(this.coachFacts).toHaveCount(0);
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
