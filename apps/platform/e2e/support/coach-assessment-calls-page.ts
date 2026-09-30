import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export class CoachAssessmentCallsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/coach/assessment-calls");
  }

  async search(term: string): Promise<void> {
    const searchField = this.page.getByRole("searchbox", {
      name: "Search calls",
    });

    await expect(async () => {
      await searchField.fill(term);
      await expect(this.page).toHaveURL(
        (url) => url.searchParams.get("q") === term,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  call(visitor: string): Locator {
    return this.page
      .getByRole("list", { name: "Assessment calls" })
      .getByRole("listitem")
      .filter({ hasText: visitor });
  }

  async sendPaymentLink(visitor: string): Promise<void> {
    const confirmation = this.page.getByRole("dialog", {
      name: "Send payment link?",
    });

    await expect(async () => {
      await this.call(visitor)
        .getByRole("button", { name: "Send payment link" })
        .click();
      await expect(confirmation).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await confirmation.getByRole("button", { name: "Send link" }).click();
  }

  async viewClient(visitor: string): Promise<void> {
    await this.call(visitor).getByRole("link", { name: "View client" }).click();
  }
}
