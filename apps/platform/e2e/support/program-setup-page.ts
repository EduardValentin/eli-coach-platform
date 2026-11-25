import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { tabTo } from "./keyboard";

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

export type SelectField = "Goal" | "Level" | "Daily steps" | "Program language";

export type ChoiceField = "Training days" | "Split" | "Session length";

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
        name: `Build ${firstName}’s program`,
        exact: true,
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

  private get createButton(): Locator {
    return this.page.getByRole("button", {
      name: /^(Create program|Creating…)$/,
    });
  }

  private get leaveDialog(): Locator {
    return this.page.getByRole("dialog", {
      name: "Unsaved changes",
      exact: true,
    });
  }

  private profileChangeDialog(firstName: string): Locator {
    return this.page.getByRole("dialog", {
      name: `This updates ${firstName}’s profile`,
      exact: true,
    });
  }

  private get problemAlerts(): Locator {
    return this.page.getByRole("alert");
  }

  get goalSelect(): Locator {
    return this.select("Goal");
  }

  get equipmentGroup(): Locator {
    return this.page.getByRole("group", { name: /^Equipment/ });
  }

  async expectFullScreenFor(clientName: string): Promise<void> {
    await expect(
      this.page.getByRole("navigation", { name: "Coach portal navigation" }),
    ).toHaveCount(0);
    await expect(this.page.getByRole("complementary")).toHaveCount(0);
    await expect(
      this.page.getByRole("navigation", { name: "Back to the client" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: `Back to ${clientName}` }),
    ).toBeVisible();
  }

  async expectEveryQuestionAsked(): Promise<void> {
    for (const field of [
      "Goal",
      "Level",
      "Daily steps",
      "Program language",
    ] as const) {
      await expect(this.select(field)).toBeVisible();
    }

    for (const field of ["Training days", "Split", "Session length"] as const) {
      await expect(
        this.page.getByRole("radiogroup", { name: field, exact: true }),
      ).toBeVisible();
    }

    await expect(this.equipmentGroup).toBeVisible();
  }

  async chooseSplit(option: string): Promise<void> {
    await this.choice("Split", option).click();
    await expect(this.choice("Split", option)).toBeChecked();
  }

  async chooseSessionLength(option: string): Promise<void> {
    await this.choice("Session length", option).click();
    await expect(this.choice("Session length", option)).toBeChecked();
  }

  async chooseFromSelect(field: SelectField, option: string): Promise<void> {
    await expect(async () => {
      await this.select(field).click();
      await this.page
        .getByRole("option", { name: option, exact: true })
        .click({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
    await expect(this.select(field)).toHaveText(option);
  }

  async toggleEquipment(option: string): Promise<void> {
    await this.equipment(option).click();
  }

  async clearEquipment(options: readonly string[]): Promise<void> {
    for (const option of options) {
      await this.equipment(option).uncheck();
    }
  }

  async expectEquipmentChecked(options: readonly string[]): Promise<void> {
    for (const option of EQUIPMENT_OPTIONS) {
      await expect(this.equipment(option)).toBeChecked({
        checked: options.includes(option),
      });
    }
  }

  async expectGoalUnchosen(): Promise<void> {
    await expect(this.goalSelect).toHaveText("Choose one");
  }

  async expectGoalProblem(problem: string): Promise<void> {
    await expect(this.goalSelect).toHaveAttribute("aria-invalid", "true");
    await this.expectDescribedBy(this.goalSelect, problem);
  }

  async expectEquipmentProblem(problem: string): Promise<void> {
    await expect(this.page.getByText(problem, { exact: true })).toBeVisible();
    await this.expectDescribedBy(
      this.page.getByRole("group", { name: /^Equipment/ }),
      problem,
    );
  }

  async expectNoProblems(): Promise<void> {
    await expect(this.goalSelect).not.toHaveAttribute("aria-invalid", "true");
    await expect(this.page.getByText("Choose a goal.")).toHaveCount(0);
    await expect(
      this.page.getByText("Choose at least one equipment option."),
    ).toHaveCount(0);
  }

  private async expectDescribedBy(field: Locator, text: string): Promise<void> {
    const describedBy = await field.getAttribute("aria-describedby");
    const ids = (describedBy ?? "").split(/\s+/).filter(Boolean);

    expect(ids.length).toBeGreaterThan(0);

    const descriptions = await field.evaluate(
      (element, referenced) =>
        referenced.map((id) => document.getElementById(id)?.textContent ?? ""),
      ids,
    );

    expect(descriptions.join(" ")).toContain(text);
  }

  async expectProblemAnnounced(problem: string): Promise<void> {
    await expect(
      this.page.getByRole("alert").filter({ hasText: problem }),
    ).toBeVisible();
  }

  async expectFocusOn(field: "Goal"): Promise<void> {
    await expect(this.select(field)).toBeFocused();
  }

  async expectCreateOffered(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Create program", exact: true }),
    ).toBeEnabled();
  }

  async expectCreating(): Promise<void> {
    const creating = this.page.getByRole("button", {
      name: "Creating…",
      exact: true,
    });

    await expect(creating).toBeDisabled();
    await expect(creating).toHaveAttribute("aria-busy", "true");
  }

  async expectSaveFailedNotice(): Promise<void> {
    await expect(
      this.problemAlerts.filter({
        hasText:
          "The program wasn’t created. Your choices are still here, so try again.",
      }),
    ).toBeVisible();
  }

  async forceSecondSubmit(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Creating…", exact: true })
      .click({ force: true });
  }

  async submitWithEnter(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Create program", exact: true })
      .press("Enter");
  }

  async clickBackToClient(clientName: string): Promise<void> {
    await this.page
      .getByRole("link", { name: `Back to ${clientName}` })
      .click();
  }

  async clickCancel(): Promise<void> {
    await this.page.getByRole("link", { name: "Cancel", exact: true }).click();
  }

  async expectLeaveAsked(): Promise<void> {
    await expect(this.leaveDialog).toBeVisible();
    await expect(
      this.leaveDialog.getByRole("button", {
        name: "Keep editing",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.leaveDialog.getByRole("button", { name: "Discard", exact: true }),
    ).toBeVisible();
  }

  async expectNoLeaveQuestion(): Promise<void> {
    await expect(this.leaveDialog).toHaveCount(0);
  }

  async keepEditing(): Promise<void> {
    await this.leaveDialog
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await expect(this.leaveDialog).toBeHidden();
  }

  async discard(): Promise<void> {
    await this.leaveDialog
      .getByRole("button", { name: "Discard", exact: true })
      .click();
  }

  async expectLeaveDialogTrapsFocus(): Promise<void> {
    for (let stop = 0; stop < 8; stop += 1) {
      await this.page.keyboard.press("Tab");
      expect(
        await this.leaveDialog.evaluate((dialog) =>
          dialog.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  }

  async dismissLeaveWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.leaveDialog).toBeHidden();
  }

  async expectFocusBackOn(name: string): Promise<void> {
    await expect(
      this.page.getByRole("link", { name, exact: true }),
    ).toBeFocused();
  }

  async expectNotReady(her: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        name: "Program not ready yet",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        `The program opens once ${her} answers are approved.`,
        {
          exact: true,
        },
      ),
    ).toBeVisible();
  }

  async tabToControl(control: Locator): Promise<void> {
    await tabTo(this.page, control);
  }

  private get radioStops(): Locator[] {
    return (["Training days", "Split", "Session length"] as const).map(
      (group) =>
        this.page
          .getByRole("radiogroup", { name: group, exact: true })
          .getByRole("radio", { checked: true }),
    );
  }

  async expectTabOrderFollowsTheScreen(clientName: string): Promise<void> {
    const stops: Locator[] = [
      this.goalSelect,
      this.select("Level"),
      this.radioStops[0]!,
      this.radioStops[1]!,
      this.radioStops[2]!,
      this.select("Daily steps"),
      ...EQUIPMENT_OPTIONS.map((option) => this.equipment(option)),
      this.select("Program language"),
      this.page.getByRole("link", { name: "Cancel", exact: true }),
      this.createButton,
    ];

    await this.page
      .getByRole("link", { name: `Back to ${clientName}` })
      .focus();

    for (const stop of stops) {
      await this.page.keyboard.press("Tab");
      await expect(stop).toBeFocused();
    }
  }

  async chooseFromSelectWithKeyboard(
    field: SelectField,
    option: string,
  ): Promise<void> {
    const trigger = this.select(field);
    const current = (await trigger.innerText()).trim();

    await this.tabToControl(trigger);
    await this.page.keyboard.press("Enter");

    const options = this.page.getByRole("listbox").getByRole("option");

    await expect(options.first()).toBeVisible();
    await expect(
      options.and(this.page.getByRole("option", { selected: true })),
    ).toBeFocused();

    const labels = (await options.allInnerTexts()).map((label) => label.trim());
    const from = Math.max(labels.indexOf(current), 0);
    const to = labels.indexOf(option);
    const direction = to > from ? 1 : -1;

    for (
      let at = from + direction;
      at !== to + direction && to !== from;
      at += direction
    ) {
      await this.page.keyboard.press(direction > 0 ? "ArrowDown" : "ArrowUp");
      await expect(
        options.filter({
          hasText: new RegExp(`^${escapedPattern(labels[at]!)}$`),
        }),
      ).toBeFocused();
    }

    await this.page.keyboard.press("Enter");
    await expect(this.select(field)).toHaveText(option);
  }

  async stepChoiceWithKeyboard(
    group: ChoiceField,
    key: "ArrowRight" | "ArrowLeft",
    expected: string,
  ): Promise<void> {
    await this.tabToControl(
      this.page
        .getByRole("radiogroup", { name: group, exact: true })
        .getByRole("radio", { checked: true }),
    );
    await this.page.keyboard.down(key);
    await expect(this.choice(group, expected)).toBeFocused();
    await this.page.keyboard.up(key);
    await expect(this.choice(group, expected)).toBeChecked();
  }

  async toggleEquipmentWithKeyboard(option: string): Promise<void> {
    const chip = this.equipment(option);
    const before = await chip.isChecked();

    await this.tabToControl(chip);
    await this.page.keyboard.press("Space");
    await expect(chip).toBeChecked({ checked: !before });
  }

  async openLeaveWithKeyboard(): Promise<void> {
    const cancel = this.page.getByRole("link", { name: "Cancel", exact: true });

    await this.tabToControl(cancel);
    await this.page.keyboard.press("Enter");
    await this.expectLeaveAsked();
  }

  async keepEditingWithKeyboard(): Promise<void> {
    await tabTo(
      this.page,
      this.leaveDialog.getByRole("button", {
        name: "Keep editing",
        exact: true,
      }),
    );
    await this.page.keyboard.press("Enter");
    await expect(this.leaveDialog).toBeHidden();
  }

  async expectProfileChangeAsked(
    firstName: string,
    description: string,
  ): Promise<void> {
    const dialog = this.profileChangeDialog(firstName);

    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(description);
    await expect(
      dialog.getByRole("button", { name: "Keep editing", exact: true }),
    ).toBeFocused();
  }

  async confirmProfileChange(firstName: string): Promise<void> {
    await this.profileChangeDialog(firstName)
      .getByRole("button", { name: "Create program", exact: true })
      .click();
    await expect(this.profileChangeDialog(firstName)).toBeHidden();
  }

  async createConfirmingProfileChange(firstName: string): Promise<void> {
    await this.create();
    await this.confirmProfileChange(firstName);
  }

  async keepEditingProfileChange(firstName: string): Promise<void> {
    await this.profileChangeDialog(firstName)
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await expect(this.profileChangeDialog(firstName)).toBeHidden();
  }

  async expectNoProfileChangeQuestion(firstName: string): Promise<void> {
    await expect(this.profileChangeDialog(firstName)).toHaveCount(0);
  }

  async expectCreateFocused(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Create program", exact: true }),
    ).toBeFocused();
  }

  async confirmProfileChangeWithKeyboard(firstName: string): Promise<void> {
    const dialog = this.profileChangeDialog(firstName);

    await tabTo(
      this.page,
      dialog.getByRole("button", { name: "Create program", exact: true }),
    );
    await this.page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
  }

  async createWithKeyboard(): Promise<void> {
    await this.tabToControl(this.createButton);
    await this.page.keyboard.press("Enter");
  }

  async expectProfileChangeNamed(
    firstName: string,
    lines: readonly string[],
  ): Promise<void> {
    const dialog = this.profileChangeDialog(firstName);

    await expect(dialog).toBeVisible();

    for (const line of lines) {
      await expect(dialog).toHaveAccessibleDescription(
        new RegExp(`(^|\\. )${escapedPattern(line)}( |$)`),
      );
    }
  }

  async expectProfileChangeWithinViewport(firstName: string): Promise<void> {
    await expect
      .poll(async () => {
        const box = await this.profileChangeDialog(firstName).boundingBox();
        const viewport = this.page.viewportSize();

        return (
          box !== null &&
          viewport !== null &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= viewport.width &&
          box.y + box.height <= viewport.height
        );
      })
      .toBe(true);
  }

  async closeProfileChangeWithEscape(firstName: string): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.profileChangeDialog(firstName)).toBeHidden();
  }

  async closeProfileChangeWithX(firstName: string): Promise<void> {
    await this.profileChangeDialog(firstName)
      .getByRole("button", { name: "Close" })
      .click();
    await expect(this.profileChangeDialog(firstName)).toBeHidden();
  }

  async closeProfileChangeOnScrim(firstName: string): Promise<void> {
    await this.page.mouse.click(2, 2);
    await expect(this.profileChangeDialog(firstName)).toBeHidden();
  }

  async expectProfileChangeKeyboardReachesCreate(
    firstName: string,
  ): Promise<void> {
    const dialog = this.profileChangeDialog(firstName);

    await expect(
      dialog.getByRole("button", { name: "Keep editing", exact: true }),
    ).toBeFocused();
    await tabTo(
      this.page,
      dialog.getByRole("button", { name: "Create program", exact: true }),
    );
  }

  async expectNoProfileChangeQuestionYet(firstName: string): Promise<void> {
    await this.expectNoProfileChangeQuestion(firstName);
  }
}
