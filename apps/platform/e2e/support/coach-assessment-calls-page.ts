import { expect, type Locator, type Page } from "@playwright/test";

const HYDRATION_RETRY_TIMEOUT_MS = 1_000;

export class CoachAssessmentCallsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/coach/assessment-calls");
  }

  call(visitorName: string): Locator {
    return this.page
      .getByRole("list", { name: "Assessment calls" })
      .getByRole("listitem")
      .filter({ hasText: visitorName });
  }

  async sendPaymentLink(visitorName: string): Promise<void> {
    const confirmation = this.page.getByRole("dialog", {
      name: "Send payment link?",
    });

    await expect(async () => {
      await this.call(visitorName)
        .getByRole("button", { name: "Send payment link" })
        .click();
      await expect(confirmation).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await confirmation.getByRole("button", { name: "Send link" }).click();
  }
}
