import { expect, type Locator, type Page } from "@playwright/test";

export type RosterColumn = "Client" | "Status" | "Bundle / Plan" | "Join date";

export type SortDirection = "ascending" | "descending";

const CLIENTS_PATH = "/coach/clients";
const HYDRATION_RETRY_TIMEOUT_MS = 1_000;

function escapedPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class CoachClientsPage {
  constructor(private readonly page: Page) {}

  private get statusFilter() {
    return this.page.getByRole("combobox", { name: "Status" });
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
    const searchField = this.page.getByRole("searchbox", {
      name: "Search clients",
    });

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
        this.page.getByRole("option", { name: `${label} ${count}` }),
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
}
