import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type SavedExercise = {
  name: string;
  type: string;
  unit: string;
  sides: "Both sides together" | "One side at a time";
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  equipment: readonly string[];
  difficulty: string;
  tags: readonly string[];
  cues: string;
};

export type ExerciseEntries = Partial<Omit<SavedExercise, "tags">> & {
  toggledTags?: readonly string[];
};

const NEW_EXERCISE_PATH = "/coach/training/exercises/new";
const TAGS = ["Strength", "Hypertrophy", "Recovery"] as const;

export class ExerciseEditorPage {
  constructor(private readonly page: Page) {}

  private get nameField() {
    return this.page.getByRole("textbox", { name: "Name" });
  }

  private get cuesField() {
    return this.page.getByRole("textbox", { name: "Form cues" });
  }

  private select(label: string): Locator {
    return this.page.getByRole("combobox", { name: label });
  }

  private multiSelect(label: string): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${label}(, \\d+ selected)?$`),
    });
  }

  private tag(tag: string): Locator {
    return this.page.getByRole("checkbox", { name: tag, exact: true });
  }

  async expectNewExercise(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_EXERCISE_PATH);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "New exercise" }),
    ).toBeVisible();
    await this.expectEntries({
      name: "",
      type: "Resistance",
      unit: "Reps",
      sides: "Both sides together",
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: [],
      difficulty: "Beginner",
      tags: [],
      cues: "",
    });
    await expect(
      this.page.getByRole("button", { name: "Create exercise" }),
    ).toBeDisabled();
  }

  async expectEditing(exercise: SavedExercise): Promise<void> {
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Edit exercise" }),
    ).toBeVisible();
    await this.expectEntries(exercise);
  }

  async enter(entries: ExerciseEntries): Promise<void> {
    await this.waitUntilInteractive();
    if (entries.name !== undefined) await this.nameField.fill(entries.name);
    if (entries.type) await this.choose("Type", entries.type);
    if (entries.unit) await this.choose("Measured in", entries.unit);
    if (entries.sides) {
      await this.page.getByRole("radio", { name: entries.sides }).check();
    }
    if (entries.primaryMuscles) {
      await this.pick("Primary muscles", entries.primaryMuscles);
    }
    if (entries.secondaryMuscles) {
      await this.pick("Secondary muscles", entries.secondaryMuscles);
    }
    if (entries.equipment) await this.pick("Equipment", entries.equipment);
    if (entries.difficulty) await this.choose("Difficulty", entries.difficulty);
    for (const tag of entries.toggledTags ?? []) await this.tag(tag).click();
    if (entries.cues !== undefined) await this.cuesField.fill(entries.cues);
  }

  async create(): Promise<void> {
    await this.page.getByRole("button", { name: "Create exercise" }).click();
  }

  async saveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  private async expectEntries(exercise: SavedExercise): Promise<void> {
    await expect(this.nameField).toHaveValue(exercise.name);
    await expect(this.select("Type")).toHaveText(exercise.type);
    await expect(this.select("Measured in")).toHaveText(exercise.unit);
    await expect(
      this.page.getByRole("radio", { name: exercise.sides }),
    ).toBeChecked();
    await this.expectPicked("Primary muscles", exercise.primaryMuscles);
    await this.expectPicked("Secondary muscles", exercise.secondaryMuscles);
    await this.expectPicked("Equipment", exercise.equipment);
    await expect(this.select("Difficulty")).toHaveText(exercise.difficulty);
    for (const tag of TAGS) {
      await expect(this.tag(tag)).toBeChecked({
        checked: exercise.tags.includes(tag),
      });
    }
    await expect(this.cuesField).toHaveValue(exercise.cues);
  }

  private async expectPicked(
    label: string,
    picked: readonly string[],
  ): Promise<void> {
    await expect(this.multiSelect(label)).toHaveAccessibleName(
      picked.length === 0 ? label : `${label}, ${picked.length} selected`,
    );
    for (const choice of picked) {
      await expect(
        this.multiSelect(label).getByText(choice, { exact: true }),
      ).toBeVisible();
    }
  }

  private async waitUntilInteractive(): Promise<void> {
    await expect(async () => {
      await this.select("Type").click();
      await expect(this.page.getByRole("listbox")).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("listbox")).toBeHidden();
  }

  private async choose(label: string, option: string): Promise<void> {
    await this.select(label).click();
    await this.page
      .getByRole("option", { name: new RegExp(`^${option}\\b`) })
      .click();
    await expect(this.select(label)).toHaveText(option);
  }

  private async pick(label: string, choices: readonly string[]) {
    await this.multiSelect(label).click();
    for (const choice of choices) {
      await this.page
        .getByRole("checkbox", { name: choice, exact: true })
        .click();
    }
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("dialog")).toBeHidden();
  }
}
