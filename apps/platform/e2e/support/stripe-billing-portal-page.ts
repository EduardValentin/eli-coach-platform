import { expect, type Page } from "@playwright/test";

type PortalTestCard = { number: string; expiry: string; cvc: string };

const BILLING_PORTAL_HOST = "billing.stripe.com";
const HAND_OFF_TIMEOUT_MS = 30_000;
const PAYMENT_METHOD_UPDATE = "Update payment method";
const CARD_FORM_FRAME = 'iframe[title="Secure payment input frame"]';
const CARD_NUMBER_PLACEHOLDER = "1234 1234 1234 1234";
const EXPIRY_PLACEHOLDER = "MM / YY";
const CVC_PLACEHOLDER = "CVC";
const ADD_CARD_LABEL = "Add";

export class StripeBillingPortalPage {
  constructor(private readonly page: Page) {}

  private get cardForm() {
    return this.page.locator(CARD_FORM_FRAME).first().contentFrame();
  }

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

  async addCard(card: PortalTestCard): Promise<void> {
    const form = this.cardForm;

    await form
      .getByPlaceholder(CARD_NUMBER_PLACEHOLDER)
      .fill(card.number, { timeout: HAND_OFF_TIMEOUT_MS });
    await form.getByPlaceholder(EXPIRY_PLACEHOLDER).fill(card.expiry);
    await form.getByPlaceholder(CVC_PLACEHOLDER).fill(card.cvc);
    await this.page
      .getByRole("button", { name: ADD_CARD_LABEL, exact: true })
      .click();
  }
}
