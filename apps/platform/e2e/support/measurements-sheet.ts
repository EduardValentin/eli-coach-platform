import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern } from "./locator-text";
import { photoNameOf } from "./progress-photo-copy";
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
const PHOTO_CONSENT_STATEMENT =
  /^I agree to share progress photos with my coach\./;
const PHOTOS_LOCKED_NOTE = "Tick the box to add your photos.";
const PHOTO_REFUSAL = "Choose a JPEG, PNG or WebP under 10 MB.";
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

  private get consent() {
    return this.sheet.getByRole("checkbox", { name: PHOTO_CONSENT_STATEMENT });
  }

  private photoInput(view: ProgressPhotoView): Locator {
    return this.sheet.getByLabel(`Add ${view} photo`, { exact: true });
  }

  private preview(view: ProgressPhotoView): Locator {
    return this.sheet.getByRole("img", {
      name: photoNameOf(view),
      exact: true,
    });
  }

  private removePreviewButton(view: ProgressPhotoView): Locator {
    return this.sheet.getByRole("button", {
      name: `Remove ${view} photo`,
      exact: true,
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
    await expect(this.consent).not.toBeChecked();
    await expect(
      this.sheet.getByText(PHOTOS_LOCKED_NOTE, { exact: true }),
    ).toBeVisible();

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeDisabled();
    }
  }

  async agreeToPhotos(): Promise<void> {
    await this.consent.check();

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeEnabled();
    }
  }

  async expectConsentAlreadyGiven(agreedOn: string): Promise<void> {
    await expect(
      this.sheet.getByText(
        `You agreed to share progress photos on ${agreedOn}.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.consent).toHaveCount(0);

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeEnabled();
    }
  }

  async expectPhotoTilesAreLabelledFileInputs(): Promise<void> {
    for (const view of PROGRESS_PHOTO_VIEWS) {
      const input = this.photoInput(view);

      await expect(input).toHaveAttribute("type", "file");
      await expect(input).toHaveAccessibleName(`Add ${view} photo`);
      await expect(input).toHaveAttribute(
        "accept",
        "image/jpeg,image/png,image/webp",
      );
      await expect(input).not.toHaveAttribute("capture");
    }
  }

  async expectNoCadenceHint(hint: RegExp): Promise<void> {
    await expect(this.sheet).not.toContainText(hint);
  }

  async addPhoto(view: ProgressPhotoView, photo: SamplePhoto): Promise<void> {
    await this.photoInput(view).setInputFiles(photo);
  }

  async expectPreview(view: ProgressPhotoView): Promise<void> {
    await expect(this.preview(view)).toBeVisible();
    await expect(this.removePreviewButton(view)).toBeVisible();
    await expect(this.photoInput(view)).toHaveCount(0);
  }

  async expectNoPreview(view: ProgressPhotoView): Promise<void> {
    await expect(this.preview(view)).toHaveCount(0);
    await expect(this.photoInput(view)).toBeEnabled();
  }

  async removePreview(view: ProgressPhotoView): Promise<void> {
    await this.removePreviewButton(view).click();
  }

  async expectRefusal(): Promise<void> {
    await expect(
      this.sheet.getByRole("alert").filter({ hasText: PHOTO_REFUSAL }),
    ).toBeVisible();
  }

  async expectNoRefusal(): Promise<void> {
    await expect(this.sheet.getByText(PHOTO_REFUSAL)).toHaveCount(0);
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

  async expectRefusedToast(view: ProgressPhotoView): Promise<void> {
    await this.expectToast(
      `The ${view} photo could not be processed, so it was not saved.`,
    );
  }

  async expectNoRefusedToast(): Promise<void> {
    await expect(
      this.page.getByText(/photo could not be processed/),
    ).toHaveCount(0);
  }

  async expectFailedToast(): Promise<void> {
    await this.expectToast("Your measurements could not be saved. Try again.");
  }
}
