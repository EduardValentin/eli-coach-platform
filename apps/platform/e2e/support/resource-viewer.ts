import { readFile } from "node:fs/promises";

import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern } from "./locator-text";

export type ShownPage = {
  title: string;
  page: number;
  count: number;
};

export type ResourceDetailReadings = {
  description?: string;
  type: string;
  pages?: number;
  size: string;
  added: string;
};

export type DownloadedResource = {
  fileName: string;
  bytes: Buffer;
};

const SWIPE_DISTANCE_PX = 120;

const DOWNLOAD_PATH = /^\/api\/client-resources\/[0-9a-f-]{36}\/download$/;

export class ResourceViewer {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.getByRole("link", { name: "Download" }) });
  }

  private get pageImage() {
    return this.dialog.getByRole("img");
  }

  private get downloadLink() {
    return this.dialog.getByRole("link", { name: "Download" });
  }

  private button(name: string): Locator {
    return this.dialog.getByRole("button", { name, exact: true });
  }

  private definitionOf(term: string): Locator {
    return this.dialog
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${escapedPattern(term)}$`) })
      .locator("xpath=following-sibling::dd[1]");
  }

  private pageName({ title, page, count }: ShownPage): string {
    return count > 1 ? `${title}, page ${page}` : title;
  }

  async expectShowing(shown: ShownPage): Promise<void> {
    await expect(this.dialog).toHaveAccessibleName(shown.title);
    await expect(this.pageImage).toHaveAccessibleName(this.pageName(shown));
    await expect
      .poll(() =>
        this.pageImage.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);

    if (shown.count > 1) {
      await expect(
        this.dialog.getByText(`${shown.page} / ${shown.count}`, {
          exact: true,
        }),
      ).toBeVisible();
    }
  }

  async expectAnnounced({
    page,
    count,
  }: Omit<ShownPage, "title">): Promise<void> {
    const announcement = this.dialog.getByText(`Page ${page} of ${count}`, {
      exact: true,
    });

    await expect(announcement).toBeAttached();
    await expect(announcement).toHaveAttribute("aria-live", "polite");
  }

  async expectAtFirstPage(): Promise<void> {
    await expect(this.button("Previous page")).toBeDisabled();
    await expect(this.button("Next page")).toBeEnabled();
  }

  async expectAtLastPage(): Promise<void> {
    await expect(this.button("Next page")).toBeDisabled();
    await expect(this.button("Previous page")).toBeEnabled();
  }

  async expectNoPageControls(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.button("Previous page")).toHaveCount(0);
    await expect(this.button("Next page")).toHaveCount(0);
  }

  async next(): Promise<void> {
    await this.button("Next page").click();
  }

  async previous(): Promise<void> {
    await this.button("Previous page").click();
  }

  async nextWithKey(): Promise<void> {
    await this.page.keyboard.press("ArrowRight");
  }

  async previousWithKey(): Promise<void> {
    await this.page.keyboard.press("ArrowLeft");
  }

  async swipeToNext(): Promise<void> {
    const box = await this.pageImage.boundingBox();

    if (!box) throw new Error("The viewer page has no box to swipe on.");

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x - SWIPE_DISTANCE_PX, y, { steps: 6 });
    await this.page.mouse.up();
  }

  async toggleZoom(): Promise<void> {
    await this.pageImage.dblclick();
  }

  async expectZoomed(): Promise<void> {
    await expect(this.pageImage).toHaveCSS(
      "transform",
      "matrix(2, 0, 0, 2, 0, 0)",
    );
  }

  async expectFitted(): Promise<void> {
    await expect(this.pageImage).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
  }

  async expectCover(title: string, fileName: string): Promise<void> {
    await expect(this.dialog).toHaveAccessibleName(title);
    await expect(
      this.dialog.getByText(fileName, { exact: true }),
    ).toBeVisible();
    await expect(this.pageImage).toHaveCount(0);
    await this.expectNoPageControls();
  }

  async expectDetails(readings: ResourceDetailReadings): Promise<void> {
    if (readings.description) {
      await expect(
        this.dialog.getByText(readings.description, { exact: true }),
      ).toBeVisible();
    }

    await expect(this.definitionOf("Type")).toHaveText(readings.type);
    await expect(this.definitionOf("Size")).toHaveText(readings.size);
    await expect(this.definitionOf("Added")).toHaveText(readings.added);

    if (readings.pages === undefined) {
      await expect(this.definitionOf("Pages")).toHaveCount(0);
      return;
    }

    await expect(this.definitionOf("Pages")).toHaveText(String(readings.pages));
  }

  async expectDownloadOf(fileName: string): Promise<void> {
    await expect(this.downloadLink).toHaveAttribute("download", fileName);
    await expect(this.downloadLink).toHaveAttribute("href", DOWNLOAD_PATH);
  }

  async expectDownloadInView(): Promise<void> {
    await expect(this.downloadLink).toBeInViewport({ ratio: 1 });
  }

  async download(): Promise<DownloadedResource> {
    const downloading = this.page.waitForEvent("download");
    await this.downloadLink.click();
    const download = await downloading;

    return {
      fileName: download.suggestedFilename(),
      bytes: await readFile(await download.path()),
    };
  }

  async expectFullScreen(): Promise<void> {
    const viewport = this.page.viewportSize();

    if (!viewport) throw new Error("The page has no viewport size.");

    await expect
      .poll(async () => {
        const box = await this.dialog.boundingBox();

        return (
          box && {
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
          }
        );
      })
      .toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
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
