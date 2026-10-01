import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import { expect, type Locator, type Page } from "@playwright/test";

import { PHOTO_TITLES, photoNameOf, photoTitleOf } from "./progress-photo-copy";

const SWIPE_DISTANCE_PX = 120;

const LIGHTBOX_NAME = new RegExp(
  `^(${PHOTO_TITLES.join("|")}) · \\d+ of \\d+$`,
);

export type ShownPhoto = {
  view: ProgressPhotoView;
  position: number;
  count: number;
};

type SwipeDirection = "left" | "right";

export class PhotoLightbox {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page.getByRole("dialog", { name: LIGHTBOX_NAME });
  }

  private get image() {
    return this.dialog.getByRole("img");
  }

  private button(name: string): Locator {
    return this.dialog.getByRole("button", { name, exact: true });
  }

  private async swipe(direction: SwipeDirection): Promise<void> {
    const box = await this.image.boundingBox();

    if (!box) throw new Error("The lightbox photo has no box to swipe on.");

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const travel =
      direction === "left" ? -SWIPE_DISTANCE_PX : SWIPE_DISTANCE_PX;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + travel, y, { steps: 6 });
    await this.page.mouse.up();
  }

  async expectShowing(
    { view, position, count }: ShownPhoto,
    takenOn: string,
  ): Promise<void> {
    await expect(this.dialog).toHaveAccessibleName(
      `${photoTitleOf(view)} · ${position} of ${count}`,
    );
    await expect(this.dialog).toHaveAccessibleDescription(takenOn);
    await expect(this.image).toHaveAccessibleName(photoNameOf(view));
    await expect
      .poll(() =>
        this.image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  async next(): Promise<void> {
    await this.button("Next photo").click();
  }

  async previous(): Promise<void> {
    await this.button("Previous photo").click();
  }

  async nextWithKey(): Promise<void> {
    await this.page.keyboard.press("ArrowRight");
  }

  async previousWithKey(): Promise<void> {
    await this.page.keyboard.press("ArrowLeft");
  }

  async swipeToNext(): Promise<void> {
    await this.swipe("left");
  }

  async swipeToPrevious(): Promise<void> {
    await this.swipe("right");
  }

  async toggleZoom(): Promise<void> {
    await this.image.dblclick();
  }

  async expectZoomed(): Promise<void> {
    await expect(this.image).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  }

  async expectFitted(): Promise<void> {
    await expect(this.image).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  }

  async expectPinchZoomKept(): Promise<void> {
    await expect(this.image.locator("..")).toHaveCSS(
      "touch-action",
      "pinch-zoom",
    );
  }

  async expectNoRemove(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole("button", { name: /^Remove/ }),
    ).toHaveCount(0);
  }

  async close(): Promise<void> {
    await this.button("Close").click();
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }
}
