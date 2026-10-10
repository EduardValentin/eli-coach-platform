import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ResourceCardFacts = {
  title: string;
  type: string;
  pages?: number;
  tags?: readonly string[];
};

type LineBox = { top: number; bottom: number };

const SHOWN_TAGS = 2;

export class ResourceCards {
  constructor(private readonly page: Page) {}

  private get region() {
    return this.page.getByRole("region", { name: "Resources", exact: true });
  }

  private get items() {
    return this.region.getByRole("listitem");
  }

  private card(title: string): Locator {
    return this.region.getByRole("button", { name: title, exact: true });
  }

  private async metaRowOf(title: string): Promise<Locator> {
    const [metaId] =
      (await this.card(title).getAttribute("aria-describedby"))?.split(" ") ??
      [];

    if (!metaId) throw new Error(`The card ${title} describes no meta row.`);

    return this.page.locator(`[id="${metaId}"]`);
  }

  private async metaItemsShareOneLine(title: string): Promise<boolean> {
    const metaRow = await this.metaRowOf(title);
    const lineBoxes = await metaRow.locator("> *").evaluateAll((items) =>
      items.map((item): LineBox => {
        const { top, bottom } = item.getBoundingClientRect();

        return { top, bottom };
      }),
    );

    return (
      lineBoxes.length > 0 &&
      lineBoxes.every((one) =>
        lineBoxes.every((other) => one.top < other.bottom),
      )
    );
  }

  private shownTagsOf(tags: readonly string[]): string[] {
    const hidden = tags.length - SHOWN_TAGS;
    const shown = tags.slice(0, SHOWN_TAGS);

    return hidden > 0 ? [...shown, `+${hidden}`] : shown;
  }

  private viewerFor(title: string): Locator {
    return this.page.getByRole("dialog", { name: title, exact: true });
  }

  async expectListed(titles: readonly string[]): Promise<void> {
    await expect(this.items).toHaveCount(titles.length);

    for (const [position, title] of titles.entries()) {
      await expect(
        this.items
          .nth(position)
          .getByRole("button", { name: title, exact: true }),
      ).toBeVisible();
    }
  }

  async expectNone(): Promise<void> {
    await expect(this.region).toHaveCount(0);
  }

  async expectCard(
    { title, type, pages, tags = [] }: ResourceCardFacts,
    marks: readonly string[] = [],
  ): Promise<void> {
    const meta = pages ? [type, `${pages} pages`] : [type];

    await expect(this.card(title)).toHaveAccessibleDescription(
      [...meta, ...marks, ...this.shownTagsOf(tags)].join(" "),
    );
  }

  async expectMetaRowOnOneLine(title: string): Promise<void> {
    await expect.poll(() => this.metaItemsShareOneLine(title)).toBe(true);
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
          (await this.items.all()).map((item) => item.boundingBox()),
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
