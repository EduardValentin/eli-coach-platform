import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern } from "./locator-text";
import {
  REFUSED_PHOTO_TOAST,
  refusedPhotoToastOf,
} from "./progress-photo-copy";
import { ProgressPhotoTiles } from "./progress-photo-tiles";
import type { SamplePhoto } from "./sample-photos";

export type MeasurementField = "Weight" | "Waist" | "Hips" | "Thigh" | "Arm";

export type MeasurementEntries = Partial<Record<MeasurementField, string>>;

export type MeasurementFieldPrompt = {
  unit: string;
  requirement: "required" | "optional";
  instruction: string;
};

const SHEET_TITLE = "Add measurements";
const SHEET_DESCRIPTION =
  "Same time of day, same tape, same spots — that is what keeps them comparable.";
const MEASUREMENT_FIELDS: readonly MeasurementField[] = [
  "Weight",
  "Waist",
  "Hips",
  "Thigh",
  "Arm",
];

export function addMeasurementsSheetOn(page: Page): Locator {
  return page.getByRole("dialog", { name: SHEET_TITLE, exact: true });
}

export class MeasurementsSheet {
  constructor(private readonly page: Page) {}

  private get sheet() {
    return addMeasurementsSheetOn(this.page);
  }

  private get photoTiles() {
    return new ProgressPhotoTiles(this.sheet);
  }

  private field(field: MeasurementField): Locator {
    return this.sheet.getByRole("spinbutton", {
      name: new RegExp(`^${field}\\b`),
    });
  }

  private entriesInFieldOrder(
    entries: MeasurementEntries,
  ): [MeasurementField, string][] {
    return MEASUREMENT_FIELDS.flatMap((field) => {
      const value = entries[field];

      return value === undefined ? [] : [[field, value]];
    });
  }

  private async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectOpen(): Promise<void> {
    await expect(this.sheet).toBeVisible();
    await expect(this.sheet).toHaveAccessibleDescription(SHEET_DESCRIPTION);
    await expect(
      this.sheet.getByText(SHEET_DESCRIPTION, { exact: true }).last(),
    ).toBeVisible();
  }

  async expectPrompts(
    prompts: Readonly<Record<MeasurementField, MeasurementFieldPrompt>>,
  ): Promise<void> {
    for (const field of MEASUREMENT_FIELDS) {
      const prompt = prompts[field];
      const optional =
        prompt.requirement === "optional" ? "\\s*\\(optional\\)" : "";
      const input = this.field(field);

      await expect(input).toHaveAccessibleName(
        new RegExp(`^${field}\\s*\\(${prompt.unit}\\)${optional}$`),
      );
      await expect(input).toHaveAccessibleDescription(prompt.instruction);
    }
  }

  async expectPrefilled(entries: MeasurementEntries): Promise<void> {
    for (const [field, value] of this.entriesInFieldOrder(entries)) {
      await expect(this.field(field)).toHaveValue(value);
    }
  }

  async fill(entries: MeasurementEntries): Promise<void> {
    for (const [field, value] of this.entriesInFieldOrder(entries)) {
      await this.field(field).fill(value);
    }
  }

  async expectProblem(field: MeasurementField, problem: string): Promise<void> {
    const input = this.field(field);

    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(
      new RegExp(`${escapedPattern(problem)}$`),
    );
  }

  async expectPhotosLocked(): Promise<void> {
    await this.photoTiles.expectLocked();
  }

  async agreeToPhotos(): Promise<void> {
    await this.photoTiles.agree();
  }

  async withdrawFromPhotos(): Promise<void> {
    await this.photoTiles.withdraw();
  }

  async expectConsentAlreadyGiven(agreedOn: string): Promise<void> {
    await this.photoTiles.expectConsentAlreadyGiven(agreedOn);
  }

  async expectPhotoTilesAreLabelledFileInputs(): Promise<void> {
    await this.photoTiles.expectLabelledFileInputs();
  }

  async expectNoCadenceHint(hint: RegExp): Promise<void> {
    await expect(this.sheet).not.toContainText(hint);
  }

  async addPhoto(view: ProgressPhotoView, photo: SamplePhoto): Promise<void> {
    await this.photoTiles.add(view, photo);
  }

  async expectPreview(view: ProgressPhotoView): Promise<void> {
    await this.photoTiles.expectPreview(view);
  }

  async expectNoPreview(view: ProgressPhotoView): Promise<void> {
    await this.photoTiles.expectNoPreview(view);
  }

  async removePreview(view: ProgressPhotoView): Promise<void> {
    await this.photoTiles.removePreview(view);
  }

  async expectRefusal(): Promise<void> {
    await this.photoTiles.expectRefusal();
  }

  async expectNoRefusal(): Promise<void> {
    await this.photoTiles.expectNoRefusal();
  }

  async save(): Promise<void> {
    await this.sheet
      .getByRole("button", { name: "Save measurements", exact: true })
      .click();
  }

  async cancel(): Promise<void> {
    await this.sheet
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
  }

  async expectClosed(): Promise<void> {
    await expect(this.sheet).toBeHidden();
  }

  async expectSavedToast(): Promise<void> {
    await this.expectToast("Measurements saved.");
  }

  async expectRefusedPhotoToast(view: ProgressPhotoView): Promise<void> {
    await this.expectToast(refusedPhotoToastOf(view));
  }

  async expectNoRefusedPhotoToast(): Promise<void> {
    await expect(this.page.getByText(REFUSED_PHOTO_TOAST)).toHaveCount(0);
  }

  async expectFailedToast(): Promise<void> {
    await this.expectToast("Your measurements could not be saved. Try again.");
  }
}
