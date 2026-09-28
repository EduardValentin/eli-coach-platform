import type { Page } from "@playwright/test";

const TEST_CARD_NUMBER = "4242 4242 4242 4242";
const FUTURE_EXPIRY = "12 / 34";
const ANY_CVC = "123";
const CHECKOUT_SESSION_ID = /cs_test_[A-Za-z0-9]+/;
const CHECKOUT_COMPLETE_PATH = "/checkout/complete";
const HOSTED_CHECKOUT_HOST = "checkout.stripe.com";

// Stripe owns the hosted Checkout markup; this is the first place to fix when it changes.
export class StripeCheckoutPage {
  constructor(private readonly page: Page) {}

  private textbox(name: RegExp) {
    return this.page.getByRole("textbox", { name });
  }

  async waitForOpenedSessionId(): Promise<string> {
    await this.page.waitForURL((url) => url.hostname === HOSTED_CHECKOUT_HOST);
    const sessionId = CHECKOUT_SESSION_ID.exec(this.page.url())?.[0];

    if (!sessionId) {
      throw new Error(`No Checkout Session id in ${this.page.url()}.`);
    }

    return sessionId;
  }

  async payWithTestCard(cardholderName: string): Promise<void> {
    await this.textbox(/card number/i).fill(TEST_CARD_NUMBER);
    await this.textbox(/expiration/i).fill(FUTURE_EXPIRY);
    await this.textbox(/cvc/i).fill(ANY_CVC);
    await this.textbox(/cardholder name|name on card/i).fill(cardholderName);
    await this.page.getByRole("button", { name: /^(Pay|Subscribe)/ }).click();
    await this.page.waitForURL(
      (url) =>
        url.pathname === CHECKOUT_COMPLETE_PATH &&
        url.searchParams.has("session"),
      { timeout: 60_000 },
    );
  }
}
