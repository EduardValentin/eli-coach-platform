import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
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

export type ProblemField = "Name" | "Primary muscles" | "Form cues";

const NEW_EXERCISE_PATH = "/coach/training/exercises/new";
const EXERCISE_PATH = /\/coach\/training\/exercises\/([^/]+)$/;
const HELD_KEY_MS = 80;
const PROBLEM_FIELDS: readonly ProblemField[] = [
  "Name",
  "Primary muscles",
  "Form cues",
];
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
      name: new RegExp(`^${label}( \\(required\\))?(, \\d+ selected)?$`),
    });
  }

  private get createButton() {
    return this.page.getByRole("button", { name: "Create exercise" });
  }

  private fieldOf(field: ProblemField): Locator {
    return field === "Primary muscles"
      ? this.multiSelect(field)
      : this.page.getByRole("textbox", { name: field });
  }

  private tag(tag: string): Locator {
    return this.page.getByRole("checkbox", { name: tag, exact: true });
  }

  async open(exerciseId: string): Promise<void> {
    await this.page.goto(`/coach/training/exercises/${exerciseId}`);
  }

  async openNew(): Promise<void> {
    await this.page.goto(NEW_EXERCISE_PATH);
  }

  async exerciseId(): Promise<string> {
    await expect(this.page).toHaveURL(EXERCISE_PATH);
    const id = EXERCISE_PATH.exec(new URL(this.page.url()).pathname)?.[1];

    if (!id || id === "new") {
      throw new Error(`${this.page.url()} is not a saved exercise's editor.`);
    }

    return id;
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
    await expect(this.createButton).toBeDisabled();
    await this.expectNoProblems();
  }

  async expectStillNew(): Promise<void> {
    await expect(this.page).toHaveURL(NEW_EXERCISE_PATH);
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
    await this.createButton.click();
  }

  async expectCreateAvailable(): Promise<void> {
    await expect(this.createButton).toBeEnabled();
  }

  async expectCreateUnavailable(): Promise<void> {
    await expect(this.createButton).toBeDisabled();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole("link", { name: "Cancel" }).click();
  }

  async goBack(): Promise<void> {
    await this.page.getByRole("link", { name: "Back to exercises" }).click();
  }

  async expectProblem(field: ProblemField, problem: string): Promise<void> {
    await expect(this.page.getByText(problem, { exact: true })).toBeVisible();
    await expect(this.fieldOf(field)).toHaveAttribute("aria-invalid", "true");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription(problem);
    for (const other of PROBLEM_FIELDS.filter((known) => known !== field)) {
      await this.expectNoProblem(other);
    }
    await this.expectCreateUnavailable();
  }

  async expectNoProblems(): Promise<void> {
    for (const field of PROBLEM_FIELDS) await this.expectNoProblem(field);
  }

  async expectFocusOn(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).toBeFocused();
  }

  async expectUnit(unit: string): Promise<void> {
    await expect(this.select("Measured in")).toHaveText(unit);
  }

  async expectUnitChoices(units: readonly string[]): Promise<void> {
    await this.select("Measured in").click();
    await expect(this.page.getByRole("option")).toHaveText(
      units.map((unit) => new RegExp(`^${unit}\\b`)),
    );
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("listbox")).toBeHidden();
  }

  async expectSecondaryChoicesWithout(
    muscles: readonly string[],
  ): Promise<void> {
    await this.multiSelect("Secondary muscles").click();
    const choices = this.page
      .getByRole("dialog")
      .getByRole("list", { name: "Secondary muscles" });
    await expect(choices.getByRole("checkbox").first()).toBeVisible();
    for (const muscle of muscles) {
      await expect(
        choices.getByRole("checkbox", { name: muscle, exact: true }),
      ).toHaveCount(0);
    }
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("dialog")).toBeHidden();
  }

  async createWithKeyboard(exercise: SavedExercise): Promise<void> {
    await this.waitUntilInteractiveByKeyboard();
    await tabTo(this.page, this.nameField);
    await this.page.keyboard.type(exercise.name);
    await this.chooseByKeyboard("Type", exercise.type);
    await this.chooseByKeyboard("Measured in", exercise.unit);
    await tabTo(
      this.page,
      this.page.getByRole("radiogroup", { name: "Sides" }),
    );
    await this.page.keyboard.press(
      exercise.sides === "One side at a time" ? "ArrowRight" : "ArrowLeft",
      { delay: HELD_KEY_MS },
    );
    await expect(
      this.page.getByRole("radio", { name: exercise.sides }),
    ).toBeChecked();
    await expect(
      this.page.getByRole("radio", { name: exercise.sides }),
    ).toBeFocused();
    await this.pickByKeyboard("Primary muscles", exercise.primaryMuscles);
    await this.pickByKeyboard("Secondary muscles", exercise.secondaryMuscles);
    await this.pickByKeyboard("Equipment", exercise.equipment);
    await this.chooseByKeyboard("Difficulty", exercise.difficulty);
    for (const tag of exercise.tags) {
      await tabTo(this.page, this.tag(tag));
      await this.page.keyboard.press("Space");
    }
    await tabTo(this.page, this.cuesField);
    await this.page.keyboard.type(exercise.cues);
    await this.expectEntries(exercise);
    await tabTo(this.page, this.createButton);
    await this.page.keyboard.press("Enter");
  }

  async saveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  async expectEntries(exercise: SavedExercise): Promise<void> {
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
      new RegExp(
        picked.length === 0
          ? `^${label}( \\(required\\))?$`
          : `^${label}( \\(required\\))?, ${picked.length} selected$`,
      ),
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

  private async expectNoProblem(field: ProblemField): Promise<void> {
    await expect(this.fieldOf(field)).not.toHaveAttribute("aria-invalid");
    await expect(this.fieldOf(field)).toHaveAccessibleDescription("");
  }

  private async waitUntilInteractiveByKeyboard(): Promise<void> {
    await expect(async () => {
      await this.page
        .getByRole("heading", { level: 1 })
        .click({ position: { x: 1, y: 1 } });
      await tabTo(this.page, this.select("Type"));
      await this.page.keyboard.press("Enter");
      await expect(this.page.getByRole("listbox")).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("listbox")).toBeHidden();
    await expect(this.select("Type")).toBeFocused();
    await this.page.keyboard.press("Shift+Tab");
  }

  private async chooseByKeyboard(label: string, option: string) {
    await tabTo(this.page, this.select(label));
    await this.page.keyboard.press("Enter");
    const choice = this.page.getByRole("option", {
      name: new RegExp(`^${option}\\b`),
    });
    await expect(this.page.getByRole("listbox")).toBeVisible();
    await this.page.keyboard.type(option);
    await expect(choice).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByRole("listbox")).toBeHidden();
    await expect(this.select(label)).toHaveText(option);
    await expect(this.select(label)).toBeFocused();
  }

  private async pickByKeyboard(label: string, choices: readonly string[]) {
    if (choices.length === 0) return;
    await tabTo(this.page, this.multiSelect(label));
    await this.page.keyboard.press("Enter");
    const options = this.page.getByRole("dialog");
    await expect(options).toBeVisible();
    for (const choice of choices) {
      await tabTo(
        this.page,
        options.getByRole("checkbox", { name: choice, exact: true }),
      );
      await this.page.keyboard.press("Space");
    }
    await this.page.keyboard.press("Escape");
    await expect(options).toBeHidden();
    await expect(this.multiSelect(label)).toBeFocused();
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
