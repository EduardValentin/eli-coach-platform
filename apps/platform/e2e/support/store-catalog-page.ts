import { expect, type Locator, type Page } from "@playwright/test";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";
import type { StoreCurrency } from "~/bounded-contexts/sales/store/public/store-currency";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { FREE_TAG, type StoreCartDrawer } from "./store-cart-drawer";

const PLANS = "Plans";

const FREE_RESOURCES = "Free resources";

export class StoreCatalogPage {
  constructor(
    private readonly page: Page,
    private readonly cartDrawer: StoreCartDrawer,
  ) {}

  private card(section: string, title: string): Locator {
    return this.page
      .getByRole("region", { name: section, exact: true })
      .getByRole("article")
      .filter({
        has: this.page.getByRole("heading", {
          level: 3,
          name: title,
          exact: true,
        }),
      });
  }

  private currencyOption(currency: StoreCurrency): Locator {
    return this.page
      .getByRole("radiogroup", { name: "Currency" })
      .getByRole("radio", { name: currency, exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto(STORE_PATH);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Find the right plan" }),
    ).toBeVisible();
  }

  async chooseCurrency(currency: StoreCurrency): Promise<void> {
    const option = this.currencyOption(currency);

    await expect(async () => {
      await option.click();
      await expect(option).toBeChecked({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
  }

  async addToCart(title: string): Promise<void> {
    await this.cartDrawer.openThrough(
      this.page.getByRole("button", { name: `Add ${title} to cart` }),
    );
  }

  async getForFree(title: string): Promise<void> {
    await this.cartDrawer.openThrough(
      this.page.getByRole("button", { name: `Get ${title} for free` }),
    );
  }

  async expectPlanAt(title: string, price: string): Promise<void> {
    await expect(
      this.card(PLANS, title).getByText(price, { exact: true }),
    ).toBeVisible();
    await expect(this.card(FREE_RESOURCES, title)).toHaveCount(0);
  }

  async expectFreeResource(title: string): Promise<void> {
    await expect(
      this.card(FREE_RESOURCES, title).getByText(FREE_TAG, { exact: true }),
    ).toBeVisible();
    await expect(this.card(PLANS, title)).toHaveCount(0);
  }
}
