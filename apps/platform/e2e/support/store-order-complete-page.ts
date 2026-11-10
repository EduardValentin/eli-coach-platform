import { expect, type Locator, type Page } from "@playwright/test";

import { FREE_TAG } from "./store-cart-drawer";

export class StoreOrderCompletePage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole("main");
  }

  async expectConfirmedFor(email: string): Promise<void> {
    await expect(
      this.main.getByRole("heading", { level: 1, name: "Order confirmed" }),
    ).toBeVisible();
    await expect(
      this.main.getByText(`Your order email is on its way to ${email}.`),
    ).toBeVisible();
  }

  async expectPaidLine(title: string, price: string): Promise<void> {
    await expect(this.lineAmount(title)).toHaveText(price);
  }

  async expectFreeLine(title: string): Promise<void> {
    await expect(this.lineAmount(title)).toHaveText(FREE_TAG);
  }

  async expectTotal(price: string): Promise<void> {
    await expect(this.lineAmount("Total")).toHaveText(price);
  }

  private lineAmount(title: string): Locator {
    return this.main
      .getByRole("term")
      .filter({ hasText: title })
      .locator("xpath=following-sibling::*[1]");
  }
}
