import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import { expect, type Locator } from "@playwright/test";

import { photoNameOf } from "./progress-photo-copy";
import type { SamplePhoto } from "./sample-photos";

const PHOTO_CONSENT_STATEMENT =
  /^I agree to share progress photos with my coach\./;
const PHOTOS_LOCKED_NOTE = "Tick the box to add your photos.";
const PHOTOS_SEND_NOTE = "Your photos are sent with your answers.";
const PHOTO_REFUSAL = "Choose a JPEG, PNG or WebP under 10 MB.";

export class ProgressPhotoTiles {
  constructor(private readonly scope: Locator) {}

  private get consent() {
    return this.scope.getByRole("checkbox", { name: PHOTO_CONSENT_STATEMENT });
  }

  private photoInput(view: ProgressPhotoView): Locator {
    return this.scope.getByLabel(`Add ${view} photo`, { exact: true });
  }

  private preview(view: ProgressPhotoView): Locator {
    return this.scope.getByRole("img", {
      name: photoNameOf(view),
      exact: true,
    });
  }

  private removePreviewButton(view: ProgressPhotoView): Locator {
    return this.scope.getByRole("button", {
      name: `Remove ${view} photo`,
      exact: true,
    });
  }

  async expectLocked(): Promise<void> {
    await expect(this.consent).not.toBeChecked();
    await expect(
      this.scope.getByText(PHOTOS_LOCKED_NOTE, { exact: true }),
    ).toBeVisible();

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeDisabled();
    }
  }

  async agree(): Promise<void> {
    await this.consent.check();

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeEnabled();
    }
  }

  async expectConsentAlreadyGiven(agreedOn: string): Promise<void> {
    await expect(
      this.scope.getByText(
        `You agreed to share progress photos on ${agreedOn}.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.consent).toHaveCount(0);

    for (const view of PROGRESS_PHOTO_VIEWS) {
      await expect(this.photoInput(view)).toBeEnabled();
    }
  }

  async expectLabelledFileInputs(): Promise<void> {
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

  async expectSendNote(): Promise<void> {
    await expect(
      this.scope.getByText(PHOTOS_SEND_NOTE, { exact: true }),
    ).toBeVisible();
    await expect(
      this.scope.getByText(PHOTOS_LOCKED_NOTE, { exact: true }),
    ).toHaveCount(0);
  }

  async add(view: ProgressPhotoView, photo: SamplePhoto): Promise<void> {
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
      this.scope.getByRole("alert").filter({ hasText: PHOTO_REFUSAL }),
    ).toBeVisible();
  }

  async expectNoRefusal(): Promise<void> {
    await expect(this.scope.getByText(PHOTO_REFUSAL)).toHaveCount(0);
  }
}
