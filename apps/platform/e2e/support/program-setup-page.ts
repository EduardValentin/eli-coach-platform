import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ProgramSetupChoices = {
  goal: string;
  level: string;
  trainingDays: string;
  split: string;
  sessionLength: string;
  dailySteps: string;
  equipment: readonly string[];
  language: string;
};

type SelectField = "Goal" | "Level" | "Daily steps" | "Program language";

type ChoiceField = "Training days" | "Split" | "Session length";

const EQUIPMENT_OPTIONS = [
  "Full gym",
  "Machines",
  "Barbell",
  "Dumbbells",
  "Kettlebells",
  "Resistance bands",
  "Bodyweight only",
] as const;

export class ProgramSetupPage {
  constructor(private readonly page: Page) {}

  private select(field: SelectField): Locator {
    return this.page.getByRole("combobox", {
      name: new RegExp(`^${field}`),
    });
  }

  private choice(field: ChoiceField, option: string): Locator {
    return this.page
      .getByRole("radiogroup", { name: field, exact: true })
      .getByRole("radio", { name: option, exact: true });
  }

  private equipment(option: string): Locator {
    return this.page
      .getByRole("group", { name: /^Equipment/ })
      .getByRole("checkbox", { name: option, exact: true });
  }

  async expectOpenFor(firstName: string, clientId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/coach/clients/${clientId}/program/new$`),
    );
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: `Build ${firstName}’s program`,
      }),
    ).toBeVisible();
  }

  async expectChoices(choices: ProgramSetupChoices): Promise<void> {
    await expect(this.select("Goal")).toHaveText(choices.goal);
    await expect(this.select("Level")).toHaveText(choices.level);
    await expect(
      this.choice("Training days", choices.trainingDays),
    ).toBeChecked();
    await expect(this.choice("Split", choices.split)).toBeChecked();
    await expect(
      this.choice("Session length", choices.sessionLength),
    ).toBeChecked();
    await expect(this.select("Daily steps")).toHaveText(choices.dailySteps);
    await expect(this.select("Program language")).toHaveText(choices.language);

    for (const option of EQUIPMENT_OPTIONS) {
      await expect(this.equipment(option)).toBeChecked({
        checked: choices.equipment.includes(option),
      });
    }
  }

  async chooseTrainingDays(days: string): Promise<void> {
    const option = this.choice("Training days", days);

    await expect(async () => {
      await option.click();
      await expect(option).toBeChecked({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
  }

  async create(): Promise<void> {
    await this.page.getByRole("button", { name: "Create program" }).click();
  }
}
