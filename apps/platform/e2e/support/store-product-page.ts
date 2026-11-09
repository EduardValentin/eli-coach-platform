import { expect, type Page } from "@playwright/test";
import { storeProductPath } from "~/bounded-contexts/sales/store/public/paths";

import type { StoreCartDrawer } from "./store-cart-drawer";

export class StoreProductPage {
  constructor(
    private readonly page: Page,
    private readonly cartDrawer: StoreCartDrawer,
  ) {}

  async open(slug: string): Promise<void> {
    await this.page.goto(storeProductPath(slug));
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async expectPrice(price: string): Promise<void> {
    await expect(
      this.page.getByRole("main").getByText(price, { exact: true }),
    ).toBeVisible();
  }

  async addToCart(title: string): Promise<void> {
    await this.cartDrawer.openThrough(
      this.page.getByRole("button", { name: `Add ${title} to cart` }),
    );
  }
}
