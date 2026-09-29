import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type RosterColumn = "Client" | "Status" | "Bundle / Plan" | "Join date";

export type SortDirection = "ascending" | "descending";

const CLIENTS_PATH = "/coach/clients";
const MAX_KEY_PRESSES = 20;
const MAX_TAB_STOPS = 40;
const TYPING_DELAY_MS = 50;

export type EmptyRoster = { title: string; description: string };

export type RosterFilters = {
  status: string;
  query: string;
  sort: string | null;
};

export class CoachClientsPage {
  constructor(private readonly page: Page) {}

  private get statusFilter() {
    return this.page.getByRole("combobox", { name: "Status" });
  }

  private get searchField() {
    return this.page.getByRole("searchbox", { name: "Search clients" });
  }

  private get clientRows() {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell") });
  }

  private statusOption(label: string): Locator {
    return this.page.getByRole("option", {
      name: new RegExp(`^${escapedPattern(label)} \\d+$`),
    });
  }

  private async isFocused(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element === document.activeElement);
  }

  private async focusedText(): Promise<string | null> {
    return this.page.evaluate(
      () => document.activeElement?.textContent ?? null,
    );
  }

  private async tabTo(locator: Locator): Promise<void> {
    await this.page.getByRole("heading", { level: 1, name: "Clients" }).click();

    for (let stop = 0; stop < MAX_TAB_STOPS; stop += 1) {
      if (await this.isFocused(locator)) return;
      await this.page.keyboard.press("Tab");
    }

    throw new Error("The keyboard never reached the expected control.");
  }

  private row(fullName: string): Locator {
    return this.clientRows.filter({ hasText: fullName });
  }

  async open(): Promise<void> {
    await this.page.goto(CLIENTS_PATH);
  }

  async openFromSidebar(): Promise<void> {
    await this.page
      .getByRole("navigation", { name: "Coach portal navigation" })
      .getByRole("link", { name: "Clients" })
      .click();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${CLIENTS_PATH}$`));
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Clients" }),
    ).toBeVisible();
  }

  async search(term: string): Promise<void> {
    const searchField = this.searchField;

    await expect(async () => {
      await searchField.fill(term);
      await expect(this.page).toHaveURL(
        (url) => url.searchParams.get("q") === term,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  async filterByStatus(label: string): Promise<void> {
    await expect(async () => {
      await this.statusFilter.click();
      await expect(this.statusOption(label)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.statusOption(label).click();
  }

  async expectStatusCount(label: string, count: number): Promise<void> {
    await expect(async () => {
      await this.statusFilter.click();
      await expect(
        this.page.getByRole("option", {
          name: `${label} ${count}`,
          exact: true,
        }),
      ).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
    await this.page.keyboard.press("Escape");
  }

  async sortBy(column: RosterColumn): Promise<void> {
    await this.page
      .getByRole("columnheader", { name: column })
      .getByRole("button", { name: column })
      .click();
  }

  async expectSortedBy(
    column: RosterColumn,
    direction: SortDirection,
  ): Promise<void> {
    await expect(
      this.page.getByRole("columnheader", { name: column }),
    ).toHaveAttribute("aria-sort", direction);
  }

  async expectRow(fullName: string, status: string): Promise<void> {
    const row = this.row(fullName);

    await expect(row).toHaveCount(1);
    await expect(row.getByText(status, { exact: true })).toBeVisible();
  }

  async expectRowDetails(
    fullName: string,
    details: readonly string[],
  ): Promise<void> {
    const row = this.row(fullName);

    for (const detail of details) {
      await expect(row.getByText(detail, { exact: true })).toBeVisible();
    }
  }

  async expectRowLink(fullName: string, label: string): Promise<void> {
    await expect(
      this.row(fullName).getByRole("link", { name: `${label} ${fullName}` }),
    ).toBeVisible();
  }

  async expectRows(fullNames: readonly string[]): Promise<void> {
    await expect(this.clientRows).toHaveText(
      fullNames.map((fullName) => new RegExp(escapedPattern(fullName))),
    );
  }

  async openClient(fullName: string): Promise<void> {
    await this.row(fullName)
      .getByRole("link", { name: new RegExp(`${escapedPattern(fullName)}$`) })
      .click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async searchWithKeyboard(term: string): Promise<void> {
    await expect(async () => {
      await this.searchField.clear();
      await this.tabTo(this.searchField);
      await this.page.keyboard.type(term, { delay: TYPING_DELAY_MS });
      await expect(this.page).toHaveURL(
        (url) => url.searchParams.get("q") === term,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  async filterByStatusWithKeyboard(label: string): Promise<void> {
    const option = this.statusOption(label);

    await expect(async () => {
      await this.tabTo(this.statusFilter);
      await this.page.keyboard.press("Enter");
      await expect(this.page.getByRole("listbox")).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();

    for (let press = 0; press < MAX_KEY_PRESSES; press += 1) {
      if (await this.isFocused(option)) break;
      const highlighted = await this.focusedText();
      await expect(async () => {
        await this.page.keyboard.press("ArrowDown");
        await expect
          .poll(() => this.focusedText(), {
            timeout: HYDRATION_RETRY_TIMEOUT_MS,
          })
          .not.toBe(highlighted);
      }).toPass();
    }

    await expect(option).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByRole("listbox")).toBeHidden();
    await expect(this.statusFilter).toBeFocused();
  }

  async expectStatusGroups(groups: readonly string[]): Promise<void> {
    await expect(async () => {
      await this.statusFilter.click();
      await expect(this.page.getByRole("listbox")).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();

    for (const group of groups) {
      await expect(
        this.page.getByRole("group", { name: group, exact: true }),
      ).toBeVisible();
    }

    await this.page.keyboard.press("Escape");
  }

  async expectFilters(filters: RosterFilters): Promise<void> {
    await expect(this.statusFilter).toHaveText(filters.status);
    await expect(this.searchField).toHaveValue(filters.query);
    await expect(this.page).toHaveURL(
      (url) => url.searchParams.get("sort") === filters.sort,
    );
  }

  async expectEmpty(empty: EmptyRoster): Promise<void> {
    await expect(this.clientRows.getByText(empty.title)).toBeVisible();
    await expect(this.clientRows.getByText(empty.description)).toBeVisible();
  }

  async expectRefused(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${CLIENTS_PATH}$`));
    await expect(
      this.page.getByRole("heading", {
        name: "You don't have access to this page",
      }),
    ).toBeVisible();
  }

  async clearFilters(): Promise<void> {
    await this.page.getByRole("button", { name: "Clear filters" }).click();
  }
}
