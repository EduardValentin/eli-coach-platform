import { expect, type Page } from "@playwright/test";
import {
  STORE_CHECKOUT_COMPLETE_PATH,
  STORE_CHECKOUT_SESSION_PARAM,
} from "~/bounded-contexts/sales/store/public/paths";

const TEST_CARD_NUMBER = "4242 4242 4242 4242";
const FUTURE_EXPIRY = "12 / 34";
const ANY_CVC = "123";
const CHECKOUT_SESSION_ID = /cs_test_[A-Za-z0-9]+/;
const CHECKOUT_COMPLETE_PATH = "/checkout/complete";
const COACHING_SESSION_PARAM = "session";
const HOSTED_CHECKOUT_HOST = "checkout.stripe.com";
const PAYMENT_REDIRECT_TIMEOUT_MS = 60_000;

type CheckoutReturn = { pathname: string; sessionParam: string };

const COACHING_RETURN: CheckoutReturn = {
  pathname: CHECKOUT_COMPLETE_PATH,
  sessionParam: COACHING_SESSION_PARAM,
};

const STORE_ORDER_RETURN: CheckoutReturn = {
  pathname: STORE_CHECKOUT_COMPLETE_PATH,
  sessionParam: STORE_CHECKOUT_SESSION_PARAM,
};

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
    await this.payAndReturnTo(cardholderName, COACHING_RETURN);
  }

  async payStoreOrderWithTestCard(cardholderName: string): Promise<void> {
    await this.payAndReturnTo(cardholderName, STORE_ORDER_RETURN);
  }

  async expectLockedEmail(email: string): Promise<void> {
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
    await expect(this.textbox(/^email$/i)).toHaveCount(0);
  }

  async expectLineItem(title: string, price: string): Promise<void> {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();
    await expect(this.page.getByText(price).first()).toBeVisible();
  }

  async expectNoLineItem(title: string): Promise<void> {
    await expect(this.page.getByText(title, { exact: true })).toHaveCount(0);
  }

  async goBack(): Promise<void> {
    await this.page.getByRole("link", { name: /^back/i }).first().click();
    await this.page.waitForURL((url) => url.hostname !== HOSTED_CHECKOUT_HOST);
  }

  private async payAndReturnTo(
    cardholderName: string,
    checkoutReturn: CheckoutReturn,
  ): Promise<void> {
    await this.textbox(/card number/i).fill(TEST_CARD_NUMBER);
    await this.textbox(/expiration/i).fill(FUTURE_EXPIRY);
    await this.textbox(/cvc/i).fill(ANY_CVC);
    await this.textbox(/cardholder name|name on card/i).fill(cardholderName);
    await this.page.getByRole("button", { name: /^(Pay|Subscribe)/ }).click();
    await this.page.waitForURL(
      (url) =>
        url.pathname === checkoutReturn.pathname &&
        url.searchParams.has(checkoutReturn.sessionParam),
      { timeout: PAYMENT_REDIRECT_TIMEOUT_MS },
    );
  }
}
