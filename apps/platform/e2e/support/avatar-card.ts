import { expect, type Locator, type Page } from "@playwright/test";

import { initialsOf } from "./avatar-initials";
import { ConfirmationDialog } from "./confirmation-dialog";
import { expectImageLoaded } from "./loaded-images";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import type { SamplePhoto } from "./sample-photos";

const UPLOAD_LABEL = "Upload picture";
const CHANGE_LABEL = "Change picture";
const ANY_PICKER_LABEL = /^(Upload|Change) picture$/;
const REMOVE_LABEL = "Remove";
const UPDATED_TOAST = "Profile picture updated";
const REMOVED_TOAST = "Profile picture removed";
const REMOVAL_LABELS = {
  title: "Remove the profile picture?",
  confirm: "Remove",
  dismiss: "Cancel",
};
const REMOVAL_BODY = "Initials show in its place.";

export class AvatarCard {
  private readonly card: Locator;

  constructor(
    private readonly page: Page,
    private readonly name: string,
  ) {
    this.card = page.getByRole("region", { name, exact: true });
  }

  private get picture() {
    return this.card.getByRole("img", {
      name: `${this.name}'s profile picture`,
      exact: true,
    });
  }

  private get initials() {
    return this.card.locator('[data-slot="avatar-fallback"]');
  }

  private picker(label: string | RegExp): Locator {
    return this.card.getByLabel(label, { exact: true });
  }

  private get removeButton() {
    return this.card.getByRole("button", { name: REMOVE_LABEL, exact: true });
  }

  private toast(message: string): Locator {
    return this.page.getByText(message, { exact: true }).first();
  }

  async expectInitials(): Promise<void> {
    await expect(this.initials).toHaveText(initialsOf(this.name));
    await expect(this.picture).toHaveCount(0);
    await expect(this.picker(UPLOAD_LABEL)).toHaveCount(1);
    await expect(this.removeButton).toHaveCount(0);
  }

  async expectPicture(): Promise<void> {
    await expectImageLoaded(this.picture);
    await expect(this.picker(CHANGE_LABEL)).toHaveCount(1);
    await expect(this.removeButton).toBeVisible();
  }

  async upload(photo: SamplePhoto): Promise<void> {
    await expect(async () => {
      await this.picker(ANY_PICKER_LABEL).setInputFiles({
        name: photo.name,
        mimeType: photo.mimeType,
        buffer: photo.buffer,
      });
      await expect(this.toast(UPDATED_TOAST)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async remove(): Promise<void> {
    const confirmation = new ConfirmationDialog(this.page, REMOVAL_LABELS);

    await expect(async () => {
      await this.removeButton.click();
      await confirmation.expectShownWithin(HYDRATION_RETRY_TIMEOUT_MS);
    }).toPass();
    await confirmation.expectOpen(REMOVAL_BODY);
    await confirmation.confirm();
    await expect(this.toast(REMOVED_TOAST)).toBeVisible();
  }
}
