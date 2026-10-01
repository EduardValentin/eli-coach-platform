import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhotoView,
} from "@eli-coach-platform/domain/client-profile";
import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { MeasurementsHistory } from "./measurements-history";
import { photoNameOf } from "./progress-photo-copy";

const FOCUS_TRAP_TAB_STOPS = 12;

export class PhotoView {
  private readonly measurementsHistory: MeasurementsHistory;

  constructor(private readonly page: Page) {
    this.measurementsHistory = new MeasurementsHistory(page);
  }

  private get dialog() {
    return this.page.getByRole("dialog", { name: /^Photos from / });
  }

  private get confirmation() {
    return this.page.getByRole("dialog", { name: "Remove this photo?" });
  }

  private photo(view: ProgressPhotoView): Locator {
    return this.dialog.getByRole("img", {
      name: photoNameOf(view),
      exact: true,
    });
  }

  private removeButton(view: ProgressPhotoView): Locator {
    return this.dialog.getByRole("button", {
      name: `Remove ${view} photo`,
      exact: true,
    });
  }

  private async expectLoaded(image: Locator): Promise<void> {
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  async openFor(date: string): Promise<void> {
    await expect(async () => {
      await this.measurementsHistory.viewPhotosAction(date).click();
      await expect(this.dialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openWithKeyboardFor(date: string): Promise<void> {
    await expect(async () => {
      await this.page.getByRole("heading", { level: 1 }).click();
      await tabTo(this.page, this.measurementsHistory.viewPhotosAction(date));
      await this.page.keyboard.press("Enter");
      await expect(this.dialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectOpenFor(date: string, privacyLine: string): Promise<void> {
    await expect(this.dialog).toHaveAccessibleName(`Photos from ${date}`);
    await expect(this.dialog).toHaveAccessibleDescription(privacyLine);
  }

  async expectPhotos(views: readonly ProgressPhotoView[]): Promise<void> {
    const missing = PROGRESS_PHOTO_VIEWS.filter(
      (view) => !views.includes(view),
    );

    for (const view of views) {
      await this.expectLoaded(this.photo(view));
    }

    for (const view of missing) {
      await expect(this.photo(view)).toHaveCount(0);
      await expect(
        this.dialog.getByText(`No ${view} photo`, { exact: true }),
      ).toBeVisible();
    }
  }

  async expectRemoveOffered(
    views: readonly ProgressPhotoView[],
  ): Promise<void> {
    for (const view of views) {
      await expect(this.removeButton(view)).toBeVisible();
    }
  }

  async expectNoRemove(): Promise<void> {
    await expect(
      this.dialog.getByRole("button", { name: /^Remove/ }),
    ).toHaveCount(0);
  }

  async askToRemove(view: ProgressPhotoView): Promise<void> {
    await this.removeButton(view).click();
    await expect(this.confirmation).toBeVisible();
    await expect(this.confirmation).toHaveAccessibleDescription(
      "It is deleted for you and your coach. Your measurements stay.",
    );
  }

  async keep(): Promise<void> {
    await this.confirmation
      .getByRole("button", { name: "Keep", exact: true })
      .click();
    await expect(this.confirmation).toBeHidden();
  }

  async confirmRemoval(): Promise<void> {
    await this.confirmation
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(this.confirmation).toBeHidden();
  }

  async expectFocusKeptInside(): Promise<void> {
    for (let stop = 0; stop < FOCUS_TRAP_TAB_STOPS; stop += 1) {
      await this.page.keyboard.press("Tab");
      expect(
        await this.dialog.evaluate((dialog) =>
          dialog.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  }

  async close(): Promise<void> {
    await this.dialog
      .getByRole("button", { name: "Close", exact: true })
      .last()
      .click();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }

  async expectFocusReturnedTo(date: string): Promise<void> {
    await expect(this.measurementsHistory.viewPhotosAction(date)).toBeFocused();
  }
}
