import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS, escapedPattern } from "./locator-text";
import { expectMacroTiles, NO_MACROS, type MacroValues } from "./macro-tiles";
import {
  NUTRITION_TAG_FAMILIES,
  NUTRITION_TAGS,
} from "./nutrition-tag-families";
import type { SamplePhoto } from "./sample-photos";

export type RecipeIngredient = {
  food: string;
  grams: string;
  method: string;
};

export type SavedRecipe = {
  name: string;
  ingredients: readonly RecipeIngredient[];
  prepMinutes: string;
  cookMinutes: string;
  instructions: string;
  icon: string | null;
  tags: readonly string[];
  macros: MacroValues;
};

export type RecipeDetails = Partial<
  Pick<SavedRecipe, "name" | "prepMinutes" | "cookMinutes" | "instructions">
>;

type TextField = "Recipe name" | "Instructions";

type MinutesField = "Prep (min)" | "Cook (min)";

export type ProblemField = TextField | MinutesField | `Grams of ${string}`;

const NEW_RECIPE_PATH = "/coach/nutrition/recipe-builder";
const RECIPE_PATH = /\/coach\/nutrition\/recipe-builder\/([^/]+)$/;
const EMPTY_ZONE =
  "Drag foods here (or use the + on a food) to add ingredients.";
const TEXT_FIELDS: readonly ProblemField[] = ["Recipe name", "Instructions"];
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";
const SAVE_ROUTE = /\/api\/coach\/recipes(\/[^/.]+)?(\.data)?$/;
const SERVED_PHOTO = /\/api\/recipes\/[^/]+\/photo\/[^/]+$/;
const DRAG_HANDLE_POSITION = { x: 6, y: 6 };
const DRAG_STEPS = 8;
const BACKDROP_POSITION = { x: 370, y: 420 };
const ICONS = [
  "Soup",
  "Salad",
  "Sandwich",
  "Pizza",
  "Steak",
  "Poultry",
  "Fish",
  "Eggs",
  "Pastry",
  "Stew",
  "Cake",
  "Ice cream",
  "Cookie",
  "Donut",
  "Coffee",
  "Smoothie",
  "Meal",
] as const;
const COOKING_METHODS = [
  "Raw",
  "Boiled",
  "Grilled",
  "Baked",
  "Pan-fried",
  "Steamed",
] as const;

export class RecipeBuilderPage {
  constructor(private readonly page: Page) {}

  private get main(): Locator {
    return this.page.getByRole("main", { name: "Recipe builder" });
  }

  private get library(): Locator {
    return this.page.getByRole("complementary", { name: "Food library" });
  }

  private get nameField(): Locator {
    return this.page.getByRole("textbox", { name: "Recipe name" });
  }

  private get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Save recipe" });
  }

  private get savingButton(): Locator {
    return this.page.getByRole("button", { name: "Saving…" });
  }

  private get photoInput(): Locator {
    return this.page.getByLabel("Recipe photo file input", { exact: true });
  }

  private get uploadPhotoButton(): Locator {
    return this.page.getByRole("button", { name: "Upload recipe photo" });
  }

  private get replacePhotoButton(): Locator {
    return this.page.getByRole("button", { name: "Replace recipe photo" });
  }

  private get removePhotoButton(): Locator {
    return this.page.getByRole("button", { name: "Remove recipe photo" });
  }

  private get photoControl(): Locator {
    return this.uploadPhotoButton.or(this.replacePhotoButton);
  }

  private get uploadFailure(): Locator {
    return this.main.getByRole("alert").filter({ hasText: UPLOAD_FAILED });
  }

  private get photoProblem(): Locator {
    return this.main.getByRole("alert").filter({ hasNotText: UPLOAD_FAILED });
  }

  private get tryAgainButton(): Locator {
    return this.main.getByRole("button", { name: "Try again" });
  }

  private visualOf(name: string): Locator {
    return this.main.getByRole("img", { name, exact: true });
  }

  private get openLibraryButton(): Locator {
    return this.page.getByRole("button", { name: "Open food library" });
  }

  private get closeLibraryButton(): Locator {
    return this.page.getByRole("button", { name: "Close food library" });
  }

  private get iconTrigger(): Locator {
    return this.page.getByRole("button", { name: /^(Choose icon|Icon: )/ });
  }

  private get iconListbox(): Locator {
    return this.page.getByRole("listbox", { name: "Meal icon" });
  }

  private get emptyZone(): Locator {
    return this.main.getByText(EMPTY_ZONE, { exact: true });
  }

  private get ingredientRows(): Locator {
    return this.main.getByRole("listitem").filter({
      has: this.page.getByRole("spinbutton", { name: /^Grams of / }),
    });
  }

  private get invalidFields(): Locator {
    return this.page.locator('[aria-invalid="true"]');
  }

  private get searchField(): Locator {
    return this.library.getByRole("searchbox", { name: "Search foods" });
  }

  private get offeredFoods(): Locator {
    return this.library.getByRole("button", { name: /^Add .+ to recipe$/ });
  }

  private iconOption(icon: string): Locator {
    return this.iconListbox.getByRole("option", { name: icon, exact: true });
  }

  private addButtonOf(food: string): Locator {
    return this.page.getByRole("button", { name: `Add ${food} to recipe` });
  }

  private gramsOf(food: string): Locator {
    return this.page.getByRole("spinbutton", { name: `Grams of ${food}` });
  }

  private methodOf(food: string): Locator {
    return this.page.getByRole("combobox", {
      name: `Cooking method for ${food}`,
    });
  }

  private minutes(field: MinutesField): Locator {
    return this.page.getByRole("spinbutton", { name: field });
  }

  private tag(tag: string): Locator {
    return this.page.getByRole("checkbox", { name: tag, exact: true });
  }

  private fieldOf(field: ProblemField): Locator {
    return TEXT_FIELDS.includes(field)
      ? this.page.getByRole("textbox", { name: field })
      : this.page.getByRole("spinbutton", { name: field });
  }

  private iconTriggerLabelOf(icon: string | null): string {
    return icon === null ? "Choose icon" : `Icon: ${icon}`;
  }

  async open(recipeId: string): Promise<void> {
    await this.page.goto(`${NEW_RECIPE_PATH}/${recipeId}`);
  }

  async openNew(): Promise<void> {
    await this.page.goto(NEW_RECIPE_PATH);
  }

  async recipeId(): Promise<string> {
    await expect(this.page).toHaveURL(RECIPE_PATH);
    const id = RECIPE_PATH.exec(new URL(this.page.url()).pathname)?.[1];

    if (!id) {
      throw new Error(`${this.page.url()} is not a saved recipe's builder.`);
    }

    return id;
  }

  async expectNew(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_RECIPE_PATH);
    await expect(this.page).toHaveTitle("New recipe | Evoa");
    await this.waitUntilInteractive();
    await this.expectEntries({
      name: "",
      ingredients: [],
      prepMinutes: "0",
      cookMinutes: "0",
      instructions: "",
      icon: null,
      tags: [],
      macros: NO_MACROS,
    });
    await this.expectNoProblems();
    await this.expectSaveDisabled();
  }

  async expectStillNew(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_RECIPE_PATH);
  }

  async expectEditing(recipe: SavedRecipe): Promise<void> {
    await expect(this.page).toHaveURL(RECIPE_PATH);
    await expect(this.page).toHaveTitle("Edit recipe | Evoa");
    await this.waitUntilInteractive();
    await this.expectEntries(recipe);
  }

  async addFood(food: string): Promise<void> {
    await this.addButtonOf(food).click();
  }

  async searchFoods(query: string): Promise<void> {
    await this.searchField.fill(query);
  }

  async expectOffered(foods: readonly string[]): Promise<void> {
    await expect(this.offeredFoods).toHaveCount(foods.length);
    for (const food of foods) {
      await expect(this.addButtonOf(food)).toBeVisible();
    }
  }

  async expectChoices(food: string): Promise<void> {
    await this.iconTrigger.click();
    await expect(this.iconListbox.getByRole("option")).toHaveText([
      "None",
      ...ICONS,
    ]);
    await this.page.keyboard.press("Escape");
    await expect(this.iconListbox).toBeHidden();
    await this.methodOf(food).click();
    await expect(this.page.getByRole("option")).toHaveText([
      ...COOKING_METHODS,
    ]);
    await this.page.keyboard.press("Escape");
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

  async composeWithKeyboard(recipe: SavedRecipe): Promise<void> {
    await this.waitUntilInteractiveByKeyboard();
    await tabTo(this.page, this.nameField);
    await this.page.keyboard.type(recipe.name);
    for (const { food, grams, method } of recipe.ingredients) {
      await tabTo(this.page, this.addButtonOf(food));
      await this.page.keyboard.press("Enter");
      await this.retypeWithKeyboard(this.gramsOf(food), grams);
      await this.chooseMethodWithKeyboard(food, method);
    }
    await this.retypeWithKeyboard(
      this.minutes("Prep (min)"),
      recipe.prepMinutes,
    );
    await this.retypeWithKeyboard(
      this.minutes("Cook (min)"),
      recipe.cookMinutes,
    );
    await tabTo(this.page, this.fieldOf("Instructions"));
    await this.page.keyboard.type(recipe.instructions);
    for (const tag of recipe.tags) {
      await tabTo(this.page, this.tag(tag));
      await this.page.keyboard.press("Space");
    }
    if (recipe.icon !== null) await this.chooseIconWithKeyboard(recipe.icon);
    await this.expectEntries(recipe);
    await tabTo(this.page, this.saveButton);
    await this.page.keyboard.press("Enter");
  }

  async dragFood(food: string): Promise<void> {
    await this.addButtonOf(food)
      .locator("..")
      .dragTo(this.emptyZone.or(this.ingredientRows.last()), {
        sourcePosition: DRAG_HANDLE_POSITION,
        steps: DRAG_STEPS,
      });
  }

  async setGrams(food: string, grams: string): Promise<void> {
    await this.gramsOf(food).fill(grams);
  }

  async chooseMethod(food: string, method: string): Promise<void> {
    await this.methodOf(food).click();
    await this.page.getByRole("option", { name: method, exact: true }).click();
    await expect(this.methodOf(food)).toHaveText(method);
  }

  async removeIngredient(food: string): Promise<void> {
    await this.page.getByRole("button", { name: `Remove ${food}` }).click();
  }

  async enterDetails(details: RecipeDetails): Promise<void> {
    if (details.name !== undefined) await this.nameField.fill(details.name);
    if (details.prepMinutes !== undefined) {
      await this.minutes("Prep (min)").fill(details.prepMinutes);
    }
    if (details.cookMinutes !== undefined) {
      await this.minutes("Cook (min)").fill(details.cookMinutes);
    }
    if (details.instructions !== undefined) {
      await this.fieldOf("Instructions").fill(details.instructions);
    }
  }

  async toggleTag(tag: string): Promise<void> {
    await this.tag(tag).click();
  }

  async chooseIcon(icon: string | null): Promise<void> {
    await this.iconTrigger.click();
    await this.iconOption(icon ?? "None").click();
    await expect(this.iconListbox).toBeHidden();
    await expect(this.iconTrigger).toHaveAccessibleName(
      this.iconTriggerLabelOf(icon),
    );
  }

  async expectMacros(macros: MacroValues): Promise<void> {
    await expectMacroTiles(
      this.main.getByRole("region", { name: "Macros" }),
      macros,
    );
  }

  async expectIngredients(
    ingredients: readonly RecipeIngredient[],
  ): Promise<void> {
    await expect(this.ingredientRows).toHaveCount(ingredients.length);
    await expect(this.emptyZone).toBeVisible({
      visible: ingredients.length === 0,
    });
    for (const [position, { food, grams, method }] of ingredients.entries()) {
      const row = this.ingredientRows.nth(position);
      const gramsField = row.getByRole("spinbutton");
      const methodField = row.getByRole("combobox");

      await expect(gramsField).toHaveAccessibleName(`Grams of ${food}`);
      await expect(gramsField).toHaveValue(grams);
      await expect(methodField).toHaveAccessibleName(
        `Cooking method for ${food}`,
      );
      await expect(methodField).toHaveText(method);
    }
  }

  async expectEntries(recipe: SavedRecipe): Promise<void> {
    await expect(this.nameField).toHaveValue(recipe.name);
    await this.expectIngredients(recipe.ingredients);
    await this.expectMacros(recipe.macros);
    await expect(this.minutes("Prep (min)")).toHaveValue(recipe.prepMinutes);
    await expect(this.minutes("Cook (min)")).toHaveValue(recipe.cookMinutes);
    await expect(this.fieldOf("Instructions")).toHaveValue(recipe.instructions);
    await expect(this.iconTrigger).toHaveAccessibleName(
      this.iconTriggerLabelOf(recipe.icon),
    );
    await expect(
      this.page.getByRole("checkbox", { checked: true }),
    ).toHaveCount(recipe.tags.length);
    for (const tag of recipe.tags) {
      await expect(this.tag(tag)).toBeChecked();
    }
  }

  async expectOnlyProblem(field: ProblemField, problem: string): Promise<void> {
    await expect(this.page.getByText(problem, { exact: true })).toBeVisible();
    await expect(this.fieldOf(field)).toHaveAttribute("aria-invalid", "true");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription(
      new RegExp(`${escapedPattern(problem)}$`),
    );
    await expect(this.invalidFields).toHaveCount(1);
    await this.expectSaveDisabled();
  }

  async expectNoProblems(): Promise<void> {
    await expect(this.invalidFields).toHaveCount(0);
  }

  async expectFocusOn(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).toBeFocused();
  }

  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectSaveAvailable(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async attachPhoto(photo: SamplePhoto): Promise<void> {
    await this.waitUntilInteractive();
    await this.photoInput.setInputFiles(photo);
  }

  async replacePhoto(photo: SamplePhoto): Promise<void> {
    const chooser = this.page.waitForEvent("filechooser");
    await this.replacePhotoButton.click();
    await (await chooser).setFiles(photo);
  }

  async removePhoto(): Promise<void> {
    await this.removePhotoButton.click();
  }

  async expectPhotoShown(name: string): Promise<void> {
    const photo = this.visualOf(name);

    await expect(photo).toBeVisible();
    await expect
      .poll(() =>
        photo.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(this.replacePhotoButton).toBeEnabled();
    await expect(this.removePhotoButton).toBeEnabled();
    await expect(this.uploadPhotoButton).toHaveCount(0);
  }

  async expectNoPhoto(name: string): Promise<void> {
    await expect(this.visualOf(name)).toBeVisible();
    await expect(this.visualOf(name)).not.toHaveJSProperty("tagName", "IMG");
    await expect(this.uploadPhotoButton).toBeVisible();
    await expect(this.replacePhotoButton).toHaveCount(0);
    await expect(this.removePhotoButton).toHaveCount(0);
  }

  async servedPhotoPath(name: string): Promise<string> {
    await this.expectPhotoShown(name);
    const source = await this.visualOf(name).getAttribute("src");
    const path = source && new URL(source, this.page.url()).pathname;

    if (!path || !SERVED_PHOTO.test(path)) {
      throw new Error(`${source} is not a served recipe photo.`);
    }

    return path;
  }

  async expectPhotoProblem(message: string): Promise<void> {
    await expect(this.photoProblem).toHaveText(message);
    await expect(this.photoControl).toHaveAttribute("aria-invalid", "true");
    await expect(this.photoControl).toHaveAccessibleDescription(message);
  }

  async expectNoPhotoProblem(): Promise<void> {
    await expect(this.photoProblem).toHaveCount(0);
    await expect(this.photoControl).not.toHaveAttribute("aria-invalid");
  }

  async expectFocusOnReplacePhoto(): Promise<void> {
    await expect(this.replacePhotoButton).toBeFocused();
  }

  async expectFocusOnUploadPhoto(): Promise<void> {
    await expect(this.uploadPhotoButton).toBeFocused();
  }

  async failNextSave(): Promise<void> {
    await this.page.route(
      (url) => SAVE_ROUTE.test(url.pathname),
      (route) => route.abort("failed"),
      { times: 1 },
    );
  }

  async expectUploadFailed(): Promise<void> {
    await expect(this.uploadFailure).toBeVisible();
    await expect(this.tryAgainButton).toBeEnabled();
    await expect(this.savingButton).toHaveCount(0);
    await this.expectSaveAvailable();
  }

  async retryUpload(): Promise<void> {
    await this.tryAgainButton.click();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole("link", { name: "Cancel" }).click();
  }

  async goBack(): Promise<void> {
    await this.page.getByRole("link", { name: "Back to Nutrition" }).click();
  }

  async openLibraryDrawer(): Promise<void> {
    await expect(this.library).toBeHidden();
    await this.openLibraryButton.click();
    await expect(this.library).toBeVisible();
    await expect(this.closeLibraryButton).toBeFocused();
  }

  async closeLibraryDrawerFromBackdrop(): Promise<void> {
    await this.page.mouse.click(BACKDROP_POSITION.x, BACKDROP_POSITION.y);
    await expect(this.library).toBeHidden();
    await expect(this.openLibraryButton).toBeFocused();
  }

  async expectTabWrapsInsideLibraryDrawer(): Promise<void> {
    await expect(this.closeLibraryButton).toBeFocused();
    await expect(this.offeredFoods.last()).toBeVisible();
    await this.page.keyboard.press("Shift+Tab");
    await expect(this.offeredFoods.last()).toBeFocused();
    await this.page.keyboard.press("Tab");
    await expect(this.closeLibraryButton).toBeFocused();
  }

  async closeLibraryDrawerWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.library).toBeHidden();
    await expect(this.openLibraryButton).toBeFocused();
  }

  async closeLibraryDrawer(): Promise<void> {
    await this.closeLibraryButton.click();
    await expect(this.library).toBeHidden();
    await expect(this.openLibraryButton).toBeFocused();
  }

  private async retypeWithKeyboard(
    field: Locator,
    value: string,
  ): Promise<void> {
    await tabTo(this.page, field);
    await this.page.keyboard.press("ControlOrMeta+A");
    await this.page.keyboard.type(value);
  }

  private async chooseMethodWithKeyboard(
    food: string,
    method: string,
  ): Promise<void> {
    await tabTo(this.page, this.methodOf(food));
    await this.page.keyboard.press("Enter");
    await this.page.keyboard.type(method);
    await expect(
      this.page.getByRole("option", { name: method, exact: true }),
    ).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.methodOf(food)).toHaveText(method);
    await expect(this.methodOf(food)).toBeFocused();
  }

  private async chooseIconWithKeyboard(icon: string): Promise<void> {
    await tabTo(this.page, this.iconTrigger);
    await this.page.keyboard.press("Enter");
    await expect(this.iconListbox).toBeVisible();
    await tabTo(this.page, this.iconOption(icon));
    await this.page.keyboard.press("Enter");
    await expect(this.iconListbox).toBeHidden();
    await expect(this.iconTrigger).toHaveAccessibleName(`Icon: ${icon}`);
    await expect(this.iconTrigger).toBeFocused();
  }

  private async waitUntilInteractiveByKeyboard(): Promise<void> {
    await expect(async () => {
      await this.emptyZone.click();
      await tabTo(this.page, this.iconTrigger);
      await this.page.keyboard.press("Enter");
      await expect(this.iconListbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.iconListbox).toBeHidden();
    await expect(this.iconTrigger).toBeFocused();
  }

  private async waitUntilInteractive(): Promise<void> {
    await expect(async () => {
      await this.iconTrigger.click();
      await expect(this.iconListbox).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.iconListbox).toBeHidden();
  }
}
