import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

type ResourceTagOption = { tag: string; count: number };

type ResourceSortKey = "Date added" | "Title";

type ResourceSortDirection =
  "Newest first" | "Oldest first" | "A to Z" | "Z to A";

type ResourceSort = {
  key: ResourceSortKey;
  direction: ResourceSortDirection;
};

const ALL_TAGS = "All tags";
const SEARCH_PARAM = "q";
const DIRECTION_LABEL = /^(Newest first|Oldest first|A to Z|Z to A)$/;

export class ResourceToolbar {
  constructor(private readonly page: Page) {}

  private get region() {
    return this.page.getByRole("region", { name: "Resources", exact: true });
  }

  private get tagFilter() {
    return this.page.getByRole("combobox", { name: "Tag", exact: true });
  }

  private get searchField() {
    return this.page.getByRole("searchbox", {
      name: "Search resources",
      exact: true,
    });
  }

  private get sortFilter() {
    return this.page.getByRole("combobox", { name: "Sort by", exact: true });
  }

  private get directionToggle() {
    return this.page.getByRole("button", { name: DIRECTION_LABEL });
  }

  private get listbox() {
    return this.page.getByRole("listbox");
  }

  private tagOption(tag: string): Locator {
    return this.page.getByRole("option", {
      name: new RegExp(`^${escapedPattern(tag)} \\d+$`),
    });
  }

  private async openMenu(trigger: Locator): Promise<void> {
    await expect(async () => {
      await trigger.click();
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async closeMenu(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
  }

  async chooseTag(tag: string): Promise<void> {
    await this.openMenu(this.tagFilter);
    await this.tagOption(tag).click();
    await expect(this.tagFilter).toHaveText(tag);
  }

  async expectChosenTag(tag: string): Promise<void> {
    await expect(this.tagFilter).toHaveText(tag);
  }

  async expectTagOptions(
    searched: number,
    options: readonly ResourceTagOption[],
  ): Promise<void> {
    await this.openMenu(this.tagFilter);
    await expect(this.listbox.getByRole("option")).toHaveText([
      `${ALL_TAGS} ${searched}`,
      ...options.map(({ tag, count }) => `${tag} ${count}`),
    ]);
    await this.closeMenu();
  }

  async search(text: string): Promise<void> {
    await expect(async () => {
      await this.searchField.fill(text);
      await expect(this.page).toHaveURL(
        (url) => url.searchParams.get(SEARCH_PARAM) === text,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  async clearSearch(): Promise<void> {
    await this.searchField.clear();
    await expect(this.page).toHaveURL(
      (url) => !url.searchParams.has(SEARCH_PARAM),
    );
  }

  async expectSearch(text: string): Promise<void> {
    await expect(this.searchField).toHaveValue(text);
  }

  async chooseSort(key: ResourceSortKey): Promise<void> {
    await this.openMenu(this.sortFilter);
    await this.page.getByRole("option", { name: key, exact: true }).click();
    await expect(this.sortFilter).toHaveText(new RegExp(`^${key}: `));
  }

  async toggleDirection(): Promise<void> {
    const before = await this.directionToggle.getAttribute("aria-label");

    await this.directionToggle.click();
    await expect(this.directionToggle).not.toHaveAccessibleName(before ?? "");
  }

  async expectSort({ key, direction }: ResourceSort): Promise<void> {
    await expect(this.sortFilter).toHaveText(
      `${key}: ${direction.toLowerCase()}`,
    );
    await expect(this.directionToggle).toHaveAccessibleName(direction);
  }

  async clearFilters(): Promise<void> {
    await this.region
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
  }

  async expectNoMatches(): Promise<void> {
    await expect(
      this.region.getByText("No matches", { exact: true }),
    ).toBeVisible();
    await expect(
      this.region.getByText("Try another tag or search.", { exact: true }),
    ).toBeVisible();
    await expect(
      this.region.getByRole("button", { name: "Clear filters", exact: true }),
    ).toBeVisible();
    await expect(this.region.getByRole("listitem")).toHaveCount(0);
  }

  async expectHidden(): Promise<void> {
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(this.tagFilter).toHaveCount(0);
    await expect(this.searchField).toHaveCount(0);
    await expect(this.sortFilter).toHaveCount(0);
  }

  async expectNoSort(): Promise<void> {
    await expect(this.tagFilter).toBeVisible();
    await expect(this.sortFilter).toHaveCount(0);
    await expect(this.directionToggle).toHaveCount(0);
  }
}
