import { expect, type Page } from "@playwright/test";

const BILLING_PORTAL_HOST = "billing.stripe.com";
const HAND_OFF_TIMEOUT_MS = 30_000;
const PAYMENT_METHOD_UPDATE = "Update payment method";

export class StripeBillingPortalPage {
  constructor(private readonly page: Page) {}

  async expectOpen(): Promise<void> {
    await this.page.waitForURL((url) => url.hostname === BILLING_PORTAL_HOST, {
      timeout: HAND_OFF_TIMEOUT_MS,
    });
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async expectPaymentMethodUpdate(): Promise<void> {
    await expect(
      this.page.getByText(PAYMENT_METHOD_UPDATE, { exact: true }),
    ).toBeVisible({ timeout: HAND_OFF_TIMEOUT_MS });
  }
}
