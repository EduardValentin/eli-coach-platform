import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import {
  NUTRITION_TAG_FAMILIES,
  NUTRITION_TAGS,
} from "./nutrition-tag-families";

export type SavedFood = {
  name: string;
  category: string;
  icon: string;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  defaultPortionGrams: string;
  tags: readonly string[];
};

export type FoodEntries = Partial<Omit<SavedFood, "tags">> & {
  toggledTags?: readonly string[];
};

type AmountField = "kcal" | "protein" | "carb" | "fat" | "defaultPortionGrams";

export type ProblemField =
  | "Name"
  | "Calories"
  | "Protein (g)"
  | "Carbs (g)"
  | "Fat (g)"
  | "Default portion (g)";

const NEW_FOOD_PATH = "/coach/nutrition/foods/new";
const FOOD_PATH = /\/coach\/nutrition\/foods\/([^/]+)$/;
type AmountTitle = Exclude<ProblemField, "Name">;

const AMOUNT_TITLES: Readonly<Record<AmountField, AmountTitle>> = {
  kcal: "Calories",
  protein: "Protein (g)",
  carb: "Carbs (g)",
  fat: "Fat (g)",
  defaultPortionGrams: "Default portion (g)",
};
const PROBLEM_FIELDS: readonly ProblemField[] = [
  "Name",
  ...Object.values(AMOUNT_TITLES),
];
const CATEGORIES = [
  "Protein",
  "Carb",
  "Fat",
  "Legumes",
  "Extra",
  "Seasoning",
] as const;
const ICONS = [
  "Egg",
  "Poultry",
  "Red meat",
  "Fish",
  "Deli / ham",
  "Dairy",
  "Grain",
  "Bread",
  "Sandwich",
  "Root veg",
  "Leafy greens",
  "Vegetable",
  "Herb / spice",
  "Fruit",
  "Banana",
  "Citrus",
  "Berry",
  "Grapes",
  "Legume / bean",
  "Nut / seed",
  "Oil / fat",
  "Chocolate",
  "Candy",
  "Ice cream",
  "Cake / dessert",
  "Soup",
  "Drink",
  "Other",
] as const;

export class FoodEditorPage {
  constructor(private readonly page: Page) {}

  private get nameField(): Locator {
    return this.page.getByRole("textbox", { name: "Name" });
  }

  private get categorySelect(): Locator {
    return this.page.getByRole("combobox", { name: "Category" });
  }

  private get listbox(): Locator {
    return this.page.getByRole("listbox");
  }

  private get createButton(): Locator {
    return this.page.getByRole("button", { name: "Create food" });
  }

  private heading(name: string): Locator {
    return this.page.getByRole("heading", { level: 1, name });
  }

  private amount(title: AmountTitle): Locator {
    return this.page.getByRole("spinbutton", { name: title });
  }

  private get iconChoices(): Locator {
    return this.page.getByRole("list", { name: "Icon" }).getByRole("button");
  }

  private icon(label: string): Locator {
    return this.page
      .getByRole("list", { name: "Icon" })
      .getByRole("button", { name: label, exact: true });
  }

  private option(name: string): Locator {
    return this.page.getByRole("option", { name, exact: true });
  }

  private tag(tag: string): Locator {
    return this.page.getByRole("checkbox", { name: tag, exact: true });
  }

  private fieldOf(field: ProblemField): Locator {
    return field === "Name" ? this.nameField : this.amount(field);
  }

  async open(foodId: string): Promise<void> {
    await this.page.goto(`/coach/nutrition/foods/${foodId}`);
  }

  async openNew(): Promise<void> {
    await this.page.goto(NEW_FOOD_PATH);
  }

  async foodId(): Promise<string> {
    await expect(this.page).toHaveURL(FOOD_PATH);
    const id = FOOD_PATH.exec(new URL(this.page.url()).pathname)?.[1];

    if (!id || id === "new") {
      throw new Error(`${this.page.url()} is not a saved food's editor.`);
    }

    return id;
  }

  async expectNewFood(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_FOOD_PATH);
    await expect(this.heading("New food")).toBeVisible();
    await this.expectEntries({
      name: "",
      category: "Protein",
      icon: "Other",
      kcal: "",
      protein: "",
      carb: "",
      fat: "",
      defaultPortionGrams: "100",
      tags: [],
    });
    await expect(this.createButton).toBeDisabled();
    await this.expectNoProblems();
  }

  async expectStillNew(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_FOOD_PATH);
  }

  async expectEditing(food: SavedFood): Promise<void> {
    await expect(this.heading("Edit food")).toBeVisible();
    await this.expectEntries(food);
  }

  async enter(entries: FoodEntries): Promise<void> {
    await this.waitUntilInteractive();
    if (entries.name !== undefined) await this.nameField.fill(entries.name);
    if (entries.category) await this.choose(entries.category);
    if (entries.icon) await this.icon(entries.icon).click();
    for (const [field, title] of Object.entries(AMOUNT_TITLES)) {
      const value = entries[field as AmountField];
      if (value !== undefined) await this.amount(title).fill(value);
    }
    for (const tag of entries.toggledTags ?? []) await this.tag(tag).click();
  }

  async create(): Promise<void> {
    await this.createButton.click();
  }

  async expectCreateAvailable(): Promise<void> {
    await expect(this.createButton).toBeEnabled();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole("link", { name: "Cancel" }).click();
  }

  async goBack(): Promise<void> {
    await this.page.getByRole("link", { name: "Back to foods" }).click();
  }

  async expectFocusOn(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).toBeFocused();
  }

  async expectChoices(): Promise<void> {
    await this.waitUntilInteractive();
    await this.categorySelect.click();
    await expect(this.listbox.getByRole("option")).toHaveText([...CATEGORIES]);
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
    await expect(this.iconChoices).toHaveCount(ICONS.length);
    for (const [index, label] of ICONS.entries()) {
      await expect(this.iconChoices.nth(index)).toHaveAccessibleName(label);
    }
    await expect(this.page.getByRole("checkbox")).toHaveCount(
      NUTRITION_TAGS.length,
    );
    for (const [family, tags] of Object.entries(NUTRITION_TAG_FAMILIES)) {
      const choices = this.page
        .getByRole("group", { name: family, exact: true })
        .getByRole("checkbox");

      await expect(choices).toHaveCount(tags.length);
      for (const [index, tag] of tags.entries()) {
        await expect(choices.nth(index)).toHaveAccessibleName(tag);
      }
    }
  }

  async createWithKeyboard(food: SavedFood): Promise<void> {
    await this.waitUntilInteractiveByKeyboard();
    await tabTo(this.page, this.nameField);
    await this.page.keyboard.type(food.name);
    await this.chooseByKeyboard(food.category);
    await tabTo(this.page, this.icon(food.icon));
    await this.page.keyboard.press("Enter");
    await expect(this.icon(food.icon)).toHaveAttribute("aria-pressed", "true");
    for (const [field, title] of Object.entries(AMOUNT_TITLES)) {
      await tabTo(this.page, this.amount(title));
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.type(food[field as AmountField]);
    }
    for (const tag of food.tags) {
      await tabTo(this.page, this.tag(tag));
      await this.page.keyboard.press("Space");
    }
    await this.expectEntries(food);
    await tabTo(this.page, this.createButton);
    await this.page.keyboard.press("Enter");
  }

  async saveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  async expectOnlyProblem(field: ProblemField, problem: string): Promise<void> {
    await expect(this.page.getByText(problem, { exact: true })).toBeVisible();
    await expect(this.fieldOf(field)).toHaveAttribute("aria-invalid", "true");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription(
      new RegExp(`${problem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    );
    for (const other of PROBLEM_FIELDS.filter((known) => known !== field)) {
      await expect(this.fieldOf(other)).not.toHaveAttribute("aria-invalid");
    }
    await expect(this.createButton).toBeDisabled();
  }

  async expectNoProblems(): Promise<void> {
    for (const field of PROBLEM_FIELDS) {
      await expect(this.fieldOf(field)).not.toHaveAttribute("aria-invalid");
    }
  }

  async expectEntries(food: SavedFood): Promise<void> {
    await expect(this.nameField).toHaveValue(food.name);
    await expect(this.categorySelect).toHaveText(food.category);
    await expect(this.icon(food.icon)).toHaveAttribute("aria-pressed", "true");
    for (const [field, title] of Object.entries(AMOUNT_TITLES)) {
      await expect(this.amount(title)).toHaveValue(food[field as AmountField]);
    }
    for (const tag of NUTRITION_TAGS) {
      await expect(this.tag(tag)).toBeChecked({
        checked: food.tags.includes(tag),
      });
    }
  }

  private async waitUntilInteractive(): Promise<void> {
    await expect(async () => {
      await this.categorySelect.click();
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
  }

  private async waitUntilInteractiveByKeyboard(): Promise<void> {
    await expect(async () => {
      await this.heading("New food").click({ position: { x: 1, y: 1 } });
      await tabTo(this.page, this.categorySelect);
      await this.page.keyboard.press("Enter");
      await expect(this.listbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.listbox).toBeHidden();
    await expect(this.categorySelect).toBeFocused();
    await this.page.keyboard.press("Shift+Tab");
  }

  private async chooseByKeyboard(category: string): Promise<void> {
    await tabTo(this.page, this.categorySelect);
    await this.page.keyboard.press("Enter");
    await expect(this.listbox).toBeVisible();
    await this.page.keyboard.type(category);
    await expect(this.option(category)).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.listbox).toBeHidden();
    await expect(this.categorySelect).toHaveText(category);
    await expect(this.categorySelect).toBeFocused();
  }

  private async choose(category: string): Promise<void> {
    await this.categorySelect.click();
    await this.option(category).click();
    await expect(this.categorySelect).toHaveText(category);
  }
}
