import { expect, type Locator, type Page } from "@playwright/test";

import { expectAccessRefused } from "./control-states";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ListedExercise = {
  name: string;
  summary: string;
  tags: readonly string[];
  primaryMuscles: readonly string[];
  difficulty: string;
};

const LIBRARY_PATH = "/coach/training";

export class ExerciseLibraryPage {
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

  private get trainingLink(): Locator {
    return this.navigation.getByRole("link", { name: "Training" });
  }

  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  private get newExerciseLink() {
    return this.page.getByRole("link", { name: "New exercise" });
  }

  private get rows(): Locator {
    return this.page.getByRole("table").getByRole("row");
  }

  private get exerciseNames() {
    return this.rows.locator("td:first-child p:first-child");
  }

  private async expectTrainingRightAfterDashboardIn(
    menu: Locator,
  ): Promise<void> {
    const links = menu.getByRole("link");

    await expect(links.nth(0)).toHaveAccessibleName("Dashboard");
    await expect(links.nth(1)).toHaveAccessibleName("Training");
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
    await this.trainingLink.click();
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(LIBRARY_PATH);
    await expect(this.heading).toHaveText("Exercises");
  }

  async expectTrainingRightAfterDashboard(): Promise<void> {
    await this.expectTrainingRightAfterDashboardIn(this.navigation);
    await expect(this.trainingLink).toHaveAttribute("aria-current", "page");
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

  async expectPhoneMenuTrainingRightAfterDashboard(): Promise<void> {
    await this.expectTrainingRightAfterDashboardIn(this.phoneMenu);
  }

  async openFromPhoneMenu(): Promise<void> {
    await this.phoneMenu.getByRole("link", { name: "Training" }).click();
    await this.expectOpen();
    await expect(this.phoneMenu).toBeHidden();
  }

  async startNewExercise(): Promise<void> {
    await this.newExerciseLink.click();
  }

  async startNewExerciseWithKeyboard(): Promise<void> {
    await this.heading.click({ position: { x: 1, y: 1 } });
    await tabTo(this.page, this.newExerciseLink);
    await this.page.keyboard.press("Enter");
  }

  async expectRefused(): Promise<void> {
    await expectAccessRefused(this.page);
  }

  async expectListedInOrder(names: readonly string[]): Promise<void> {
    const listed = await this.exerciseNames.allInnerTexts();

    expect(listed.filter((name) => names.includes(name))).toEqual(names);
  }

  async expectConfirmation(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectListed(exercise: ListedExercise): Promise<void> {
    await expect(this.rowOf(exercise.name).getByRole("cell")).toHaveText([
      `${exercise.name}${exercise.summary}`,
      exercise.tags.join(""),
      exercise.primaryMuscles.join(""),
      exercise.difficulty,
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
