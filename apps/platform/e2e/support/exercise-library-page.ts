import { expect, type Locator, type Page } from "@playwright/test";

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

  private rowOf(name: string): Locator {
    return this.page
      .getByRole("table")
      .getByRole("row")
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  private actionsTriggerOf(name: string): Locator {
    return this.page.getByRole("button", { name: `Actions for ${name}` });
  }

  async open(): Promise<void> {
    await this.page.goto(LIBRARY_PATH);
    await this.expectOpen();
  }

  async openFromNavigation(): Promise<void> {
    await this.navigation.getByRole("link", { name: "Training" }).click();
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(LIBRARY_PATH);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Exercises" }),
    ).toBeVisible();
  }

  async expectTrainingRightAfterDashboard(): Promise<void> {
    const links = this.navigation.getByRole("link");

    await expect(links.nth(0)).toHaveAccessibleName("Dashboard");
    await expect(links.nth(1)).toHaveAccessibleName("Training");
    await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  }

  async startNewExercise(): Promise<void> {
    await this.page.getByRole("link", { name: "New exercise" }).click();
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
