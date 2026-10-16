import { expect, type Locator, type Page } from "@playwright/test";

import { checkInTab, type CheckInTab } from "./check-in-tabs";
import { isFocused, tabTo } from "./keyboard";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type CheckInFilter = "Kind" | "Waiting on";

export type OptionCounts = Readonly<Record<string, number>>;

export type CountedOption = { label: string; count: number };

export type SortReading = {
  direction: "Soonest first" | "Latest first";
  toggle: "pressed" | "released";
};

export type AddressParams = Readonly<Record<string, string>>;

type KeyPress = { key: string; target: Locator };

const SORT_KEY_LABEL = "Check-in date";
const DIRECTION_LABEL = /^(Soonest first|Latest first)$/;
const PAGE_PARAM = "page";
const NO_MATCH_TITLE = "No check-ins match";
const NO_MATCH_HINT = "Try another filter or search.";
const KEYBOARD_REACH_TIMEOUT_MS = 10_000;

export class CheckInToolbar {
  constructor(private readonly page: Page) {}

  private get listbox(): Locator {
    return this.page.getByRole("listbox");
  }

  private get sortTrigger(): Locator {
    return this.page.getByRole("combobox", { name: "Sort by", exact: true });
  }

  private get directionToggle(): Locator {
    return this.page.getByRole("button", { name: DIRECTION_LABEL });
  }

  private get clearFiltersButton(): Locator {
    return this.page.getByRole("button", {
      name: "Clear filters",
      exact: true,
    });
  }

  private get noMatchTitle(): Locator {
    return this.page.getByText(NO_MATCH_TITLE, { exact: true });
  }

  private filterTrigger(filter: CheckInFilter): Locator {
    return this.page.getByRole("combobox", { name: filter, exact: true });
  }

  private countedName(option: CountedOption): RegExp {
    return new RegExp(`^${escapedPattern(option.label)}\\s*${option.count}$`);
  }

  private optionLabelled(label: string): Locator {
    return this.listbox.getByRole("option", {
      name: new RegExp(`^${escapedPattern(label)}\\s*\\d+$`),
    });
  }

  private pageLink(pageNumber: number): Locator {
    return this.page
      .getByRole("navigation", { name: "pagination" })
      .getByRole("link", { name: `Go to page ${pageNumber}`, exact: true });
  }

  private async tabFromHeadingTo(control: Locator): Promise<void> {
    await this.page
      .getByRole("heading", { level: 1 })
      .click({ position: { x: 1, y: 1 } });
    await tabTo(this.page, control);
  }

  private async pressUntilFocused({ key, target }: KeyPress): Promise<void> {
    await expect(async () => {
      if (await isFocused(target)) return;
      await this.page.keyboard.press(key);
      await expect(target).toBeFocused({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass({ timeout: KEYBOARD_REACH_TIMEOUT_MS });
  }

  private async openFilter(filter: CheckInFilter): Promise<void> {
    await expect(async () => {
      await this.filterTrigger(filter).click();
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async openFilterByKeyboard(filter: CheckInFilter): Promise<void> {
    await expect(async () => {
      await this.tabFromHeadingTo(this.filterTrigger(filter));
      await this.page.keyboard.press("Enter");
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async closeFilter(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
  }

  private async expectOnPage(pageNumber: number): Promise<void> {
    await expect(this.page).toHaveURL(
      (url) =>
        url.searchParams.get(PAGE_PARAM) ===
        (pageNumber === 1 ? null : `${pageNumber}`),
    );
  }

  private async expectDirectionChangedFrom(
    before: string | null,
  ): Promise<void> {
    await expect(this.directionToggle).not.toHaveAccessibleName(before ?? "", {
      timeout: HYDRATION_RETRY_TIMEOUT_MS,
    });
  }

  async chooseFilter(filter: CheckInFilter, label: string): Promise<void> {
    await this.openFilter(filter);
    await this.optionLabelled(label).click();
    await expect(this.listbox).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(label);
  }

  async chooseFilterByKeyboard(
    filter: CheckInFilter,
    option: CountedOption,
  ): Promise<void> {
    const target = this.listbox.getByRole("option", {
      name: this.countedName(option),
    });

    await this.openFilterByKeyboard(filter);
    await expect(
      this.listbox.getByRole("option", { selected: true }),
    ).toBeFocused();
    await this.pressUntilFocused({ key: "ArrowDown", target });
    await expect(target).toHaveAccessibleName(this.countedName(option));
    await this.page.keyboard.press("Enter");
    await expect(this.listbox).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(option.label);
    await expect(this.filterTrigger(filter)).toBeFocused();
  }

  async expectFilterReads(filter: CheckInFilter, label: string): Promise<void> {
    await expect(this.filterTrigger(filter)).toHaveText(label);
  }

  async expectOptionCounts(
    filter: CheckInFilter,
    counts: OptionCounts,
  ): Promise<void> {
    const entries = Object.entries(counts);

    await this.openFilter(filter);
    await expect(this.listbox.getByRole("option")).toHaveCount(entries.length);
    for (const [label, count] of entries) {
      await expect(this.optionLabelled(label)).toHaveAccessibleName(
        this.countedName({ label, count }),
      );
    }
    await this.closeFilter();
  }

  async expectSort({ direction, toggle }: SortReading): Promise<void> {
    await expect(this.sortTrigger).toHaveText(
      `${SORT_KEY_LABEL}: ${direction.toLowerCase()}`,
    );
    await expect(this.directionToggle).toHaveAccessibleName(direction);
    await expect(this.directionToggle).toHaveAttribute(
      "aria-pressed",
      `${toggle === "pressed"}`,
    );
  }

  async toggleSort(): Promise<void> {
    const before = await this.directionToggle.getAttribute("aria-label");

    await expect(async () => {
      await this.directionToggle.click();
      await this.expectDirectionChangedFrom(before);
    }).toPass();
  }

  async toggleSortByKeyboard(): Promise<void> {
    const before = await this.directionToggle.getAttribute("aria-label");

    await expect(async () => {
      await this.tabFromHeadingTo(this.sortTrigger);
      await this.page.keyboard.press("Tab");
      await expect(this.directionToggle).toBeFocused();
      await this.page.keyboard.press("Enter");
      await this.expectDirectionChangedFrom(before);
    }).toPass();
  }

  async showTabByKeyboard(tab: CheckInTab): Promise<void> {
    const target = checkInTab(this.page, tab);

    await this.tabFromHeadingTo(this.page.getByRole("tab", { selected: true }));
    await this.pressUntilFocused({ key: "ArrowRight", target });
    await expect(target).toHaveAttribute("aria-selected", "true");
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.pageLink(pageNumber).click();
    await this.expectOnPage(pageNumber);
  }

  async goToPageByKeyboard(pageNumber: number): Promise<void> {
    await this.tabFromHeadingTo(this.pageLink(pageNumber));
    await this.page.keyboard.press("Enter");
    await this.expectOnPage(pageNumber);
  }

  async expectShowing(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectNoMatch(): Promise<void> {
    await expect(this.noMatchTitle).toBeVisible();
    await expect(
      this.page.getByText(NO_MATCH_HINT, { exact: true }),
    ).toBeVisible();
    await expect(this.clearFiltersButton).toBeVisible();
  }

  async clearFilters(): Promise<void> {
    await expect(async () => {
      await this.clearFiltersButton.click();
      await expect(this.noMatchTitle).toBeHidden({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectAddress(path: string, params: AddressParams): Promise<void> {
    await expect
      .poll(() => {
        const address = new URL(this.page.url());

        return {
          path: address.pathname,
          params: Object.fromEntries(address.searchParams),
        };
      })
      .toEqual({ path, params });
  }
}
