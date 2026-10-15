import { expect, type Locator, type Page } from "@playwright/test";

import { expectAccessRefused } from "./control-states";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ListedFood = {
  name: string;
  category: string;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  tags: readonly string[];
};

const LIBRARY_PATH = "/coach/nutrition";

export class NutritionLibraryPage {
  constructor(private readonly page: Page) {}

  private get navigation() {
    return this.page.getByRole("navigation", {
      name: "Coach portal navigation",
    });
  }

  private get phoneMenu() {
    return this.page.getByRole("dialog", {
      name: "Coach portal mobile navigation",
    });
  }

  private get nutritionLink(): Locator {
    return this.navigation.getByRole("link", { name: "Nutrition" });
  }

  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  private get newFoodLink(): Locator {
    return this.page.getByRole("link", { name: "New food" });
  }

  private get rows(): Locator {
    return this.page.getByRole("table").getByRole("row");
  }

  private get foodNames(): Locator {
    return this.rows.locator("td:first-child p:first-child");
  }

  private async expectNutritionRightAfterTrainingIn(
    menu: Locator,
  ): Promise<void> {
    const links = menu.getByRole("link");

    await expect(links.nth(1)).toHaveAccessibleName("Training");
    await expect(links.nth(2)).toHaveAccessibleName("Nutrition");
  }

  private rowOf(name: string): Locator {
    return this.rows.filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  private actionsTriggerOf(name: string): Locator {
    return this.page.getByRole("button", { name: `Actions for ${name}` });
  }

  async open(): Promise<void> {
    await this.page.goto(LIBRARY_PATH);
  }

  async openFromNavigation(): Promise<void> {
    await this.nutritionLink.click();
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(LIBRARY_PATH);
    await expect(this.heading).toHaveText("Nutrition");
  }

  async expectNutritionRightAfterTraining(): Promise<void> {
    await this.expectNutritionRightAfterTrainingIn(this.navigation);
    await expect(this.nutritionLink).toHaveAttribute("aria-current", "page");
  }

  async openPhoneMenu(): Promise<void> {
    await expect(async () => {
      await this.page
        .getByRole("banner", { name: "Coach portal top bar" })
        .getByRole("button", { name: "Open menu" })
        .click();
      await expect(this.phoneMenu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectPhoneMenuNutritionRightAfterTraining(): Promise<void> {
    await this.expectNutritionRightAfterTrainingIn(this.phoneMenu);
  }

  async openFromPhoneMenu(): Promise<void> {
    await this.phoneMenu.getByRole("link", { name: "Nutrition" }).click();
    await this.expectOpen();
    await expect(this.phoneMenu).toBeHidden();
  }

  async startNewFood(): Promise<void> {
    await this.newFoodLink.click();
  }

  async startNewFoodWithKeyboard(): Promise<void> {
    await this.heading.click({ position: { x: 1, y: 1 } });
    await tabTo(this.page, this.newFoodLink);
    await this.page.keyboard.press("Enter");
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.page.getByText("No foods yet", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText("Foods you add appear here.", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(0);
  }

  async expectListedInOrder(names: readonly string[]): Promise<void> {
    const listed = await this.foodNames.allInnerTexts();

    expect(listed.filter((name) => names.includes(name))).toEqual(names);
  }

  async expectRefused(): Promise<void> {
    await expectAccessRefused(this.page);
  }

  async expectConfirmation(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectListed(food: ListedFood): Promise<void> {
    await expect(this.rowOf(food.name).getByRole("cell")).toHaveText([
      `${food.name}${food.category}`,
      food.kcal,
      `${food.protein}g`,
      `${food.carb}g`,
      `${food.fat}g`,
      food.tags.join(""),
      "",
    ]);
  }

  async expectNotListed(name: string): Promise<void> {
    await expect(this.rowOf(name)).toHaveCount(0);
  }

  async edit(name: string): Promise<void> {
    const edit = this.page.getByRole("menuitem", { name: "Edit" });

    await expect(async () => {
      await this.actionsTriggerOf(name).click();
      await expect(edit).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
    await edit.click();
  }
}
