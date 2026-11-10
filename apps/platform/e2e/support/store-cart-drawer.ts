import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export const FREE_TAG = "Free";

const IMMEDIATE_DELIVERY_REQUEST =
  /^Start my download now\. I understand I lose my 14-day right to withdraw/;

export class StoreCartDrawer {
  constructor(private readonly page: Page) {}

  private get dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Your cart" });
  }

  private line(title: string): Locator {
    return this.dialog.getByRole("listitem").filter({
      has: this.page.getByText(title, { exact: true }),
    });
  }

  async openThrough(control: Locator): Promise<void> {
    await expect(async () => {
      await control.click();
      await expect(this.dialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async close(): Promise<void> {
    await this.dialog.getByRole("button", { name: "Close" }).click();
    await expect(this.dialog).toBeHidden();
  }

  async continueToPayment(email: string): Promise<void> {
    await this.dialog.getByRole("button", { name: "Continue" }).click();
    await this.dialog
      .getByRole("textbox", { name: "Email address (required)", exact: true })
      .fill(email);
    await this.dialog
      .getByRole("checkbox", {
        name: "I agree to the Terms & Conditions. (required)",
        exact: true,
      })
      .check();
    await this.dialog
      .getByRole("checkbox", { name: IMMEDIATE_DELIVERY_REQUEST })
      .check();
    await this.dialog
      .getByRole("button", { name: "Continue to payment" })
      .click();
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async expectNotice(message: string): Promise<void> {
    await expect(
      this.dialog.getByRole("status").filter({ hasText: message }),
    ).toBeVisible();
  }

  async expectLinePrice(title: string, price: string): Promise<void> {
    await expect(
      this.line(title).getByText(price, { exact: true }),
    ).toBeVisible();
  }

  async expectFreeLine(title: string): Promise<void> {
    await expect(
      this.line(title).getByText(FREE_TAG, { exact: true }),
    ).toBeVisible();
  }

  async expectTotal(price: string): Promise<void> {
    await expect(this.dialog.getByRole("term")).toHaveText("Total");
    await expect(this.dialog.getByRole("definition")).toHaveText(price);
  }
}
