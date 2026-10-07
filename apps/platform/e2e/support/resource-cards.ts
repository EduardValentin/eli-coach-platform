import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ResourceCardFacts = {
  title: string;
  type: string;
  pages?: number;
};

export class ResourceCards {
  constructor(private readonly page: Page) {}

  private get region() {
    return this.page.getByRole("region", { name: "Resources", exact: true });
  }

  private get cards() {
    return this.region.getByRole("button");
  }

  private card(title: string): Locator {
    return this.region.getByRole("button", { name: title, exact: true });
  }

  private viewerFor(title: string): Locator {
    return this.page.getByRole("dialog", { name: title, exact: true });
  }

  async expectListed(titles: readonly string[]): Promise<void> {
    await expect(this.cards).toHaveCount(titles.length);

    for (const [position, title] of titles.entries()) {
      await expect(this.cards.nth(position)).toHaveAccessibleName(title);
    }
  }

  async expectNone(): Promise<void> {
    await expect(this.region).toHaveCount(0);
  }

  async expectCard(
    { title, type, pages }: ResourceCardFacts,
    marks: readonly string[] = [],
  ): Promise<void> {
    const meta = pages ? [type, `${pages} pages`] : [type];

    await expect(this.card(title)).toHaveAccessibleDescription(
      [...meta, ...marks].join(" "),
    );
  }

  async expectThumbnail(title: string): Promise<void> {
    const thumbnail = this.card(title).locator("img");

    await expect
      .poll(() =>
        thumbnail.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  async expectCover(title: string): Promise<void> {
    await expect(this.card(title)).toBeVisible();
    await expect(this.card(title).locator("img")).toHaveCount(0);
  }

  async expectColumns(count: number): Promise<void> {
    await expect
      .poll(async () => {
        const boxes = await Promise.all(
          (await this.cards.all()).map((card) => card.boundingBox()),
        );

        return new Set(boxes.map((box) => Math.round(box?.x ?? -1))).size;
      })
      .toBe(count);
  }

  async open(title: string): Promise<void> {
    await expect(async () => {
      await this.card(title).click();
      await expect(this.viewerFor(title)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openWithKeyboard(title: string): Promise<void> {
    await tabTo(this.page, this.card(title));
    await this.page.keyboard.press("Enter");
    await expect(this.viewerFor(title)).toBeVisible();
  }

  async expectFocusOn(title: string): Promise<void> {
    await expect(this.card(title)).toBeFocused();
  }
}
