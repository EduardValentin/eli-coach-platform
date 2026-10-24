import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const SAVE_LABEL = "Save changes";
const SAVED_TOAST = "Changes saved";

export class ProfileFormSection {
  private readonly section: Locator;

  constructor(
    private readonly page: Page,
    title: string,
  ) {
    this.section = page.getByRole("region", { name: title, exact: true });
  }

  private get saveButton() {
    return this.section.getByRole("button", { name: SAVE_LABEL, exact: true });
  }

  private textbox(label: string): Locator {
    return this.section.getByRole("textbox", {
      name: new RegExp(`^${escapedPattern(label)}`),
    });
  }

  private amount(label: string): Locator {
    return this.section.getByRole("spinbutton", {
      name: new RegExp(`^${escapedPattern(label)}`),
    });
  }

  private select(label: string): Locator {
    return this.section.getByRole("combobox", {
      name: new RegExp(`^${escapedPattern(label)}`),
    });
  }

  private choiceGroup(label: string): Locator {
    return this.section.getByRole("radiogroup", {
      name: new RegExp(`^${escapedPattern(label)}`),
    });
  }

  private choice(group: string, option: string): Locator {
    return this.choiceGroup(group).getByRole("radio", {
      name: option,
      exact: true,
    });
  }

  private chip(option: string): Locator {
    return this.section.getByRole("checkbox", { name: option, exact: true });
  }

  private async changeUntilDirty(change: () => Promise<void>): Promise<void> {
    await expect(async () => {
      await change();
      await expect(this.saveButton).toBeEnabled({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectShown(): Promise<void> {
    await expect(this.section).toBeVisible();
  }

  async expectAbsent(): Promise<void> {
    await expect(this.section).toHaveCount(0);
  }

  async expectLine(line: string): Promise<void> {
    await expect(this.section.getByText(line, { exact: true })).toBeVisible();
    await expect(this.saveButton).toHaveCount(0);
  }

  async expectText(label: string, value: string): Promise<void> {
    await expect(this.textbox(label)).toHaveValue(value);
  }

  async expectAmount(label: string, value: string): Promise<void> {
    await expect(this.amount(label)).toHaveValue(value);
  }

  async expectSelected(label: string, option: string): Promise<void> {
    await expect(this.select(label)).toHaveText(option);
  }

  async expectChosen(group: string, option: string): Promise<void> {
    await expect(this.choice(group, option)).toBeChecked();
  }

  async expectTicked(options: readonly string[]): Promise<void> {
    for (const option of options) {
      await expect(this.chip(option)).toBeChecked();
    }
  }

  async expectReadOnly(value: string, reasonLabel: string): Promise<void> {
    await expect(this.section.getByText(value, { exact: true })).toBeVisible();
    await expect(
      this.section.getByRole("button", { name: reasonLabel, exact: true }),
    ).toBeVisible();
  }

  async fillText(label: string, value: string): Promise<void> {
    await this.changeUntilDirty(() => this.textbox(label).fill(value));
  }

  async choose(group: string, option: string): Promise<void> {
    await this.changeUntilDirty(() => this.choice(group, option).click());
    await expect(this.choice(group, option)).toBeChecked();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(
      this.page.getByText(SAVED_TOAST, { exact: true }).first(),
    ).toBeVisible();
    await expect(this.saveButton).toBeDisabled();
  }
}
