import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const SESSION_NAME = "Session name";
const SESSION_SETTLE_MS = 5_000;

export class SessionCard {
  constructor(private readonly page: Page) {}

  private get week(): Locator {
    return this.page.getByRole("region", { name: "Week", exact: true });
  }

  private get nameField(): Locator {
    return this.page.getByRole("textbox", { name: SESSION_NAME });
  }

  private get warmUp(): Locator {
    return this.page.getByRole("region", { name: "Warm-up", exact: true });
  }

  private get coolDown(): Locator {
    return this.page.getByRole("region", { name: "Cool-down", exact: true });
  }

  private get coolDownSwitch(): Locator {
    return this.page.getByRole("switch", { name: "Cool-down" });
  }

  private actionsOf(exercise: string): Locator {
    return this.page.getByRole("button", { name: `${exercise} actions` });
  }

  private substitutionsOf(exercise: string): Locator {
    return this.cardOf(exercise).getByRole("group", { name: "Substitutions" });
  }

  private addButtonFor(slot: string): Locator {
    return this.page
      .getByRole("button", { name: new RegExp(`^Add exercise to ${slot}`) })
      .or(
        this.page.getByRole("button", {
          name: new RegExp(`^Add or drop an exercise.* in ${slot}`),
        }),
      );
  }

  cardOf(exercise: string): Locator {
    return this.page.locator(`article[aria-label$=" ${exercise}"]`);
  }

  async openFirstStrengthDay(): Promise<void> {
    const face = this.week.locator("button[data-parity^='day-face']").first();

    await expect(async () => {
      await face.click();
      await expect(this.nameField).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openSessionOfChosenDay(): Promise<void> {
    await this.page.getByRole("button", { name: "Open session" }).click();
    await expect(this.nameField).toBeVisible();
  }

  async openLibraryFor(slot: string): Promise<void> {
    await this.addButtonFor(slot).click();
  }

  async openLibraryForWarmUp(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Add exercise to warm-up" })
      .click();
  }

  async openLibraryForCoolDown(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Add stretch to cool-down" })
      .click();
  }

  async openLibraryForSubstitution(exercise: string): Promise<void> {
    await this.substitutionsOf(exercise)
      .getByRole("button", { name: `Add substitution for ${exercise}` })
      .click();
  }

  async expectCardLabels(labels: readonly string[]): Promise<void> {
    await expect(async () => {
      const found = await this.page
        .locator("article[aria-label]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("aria-label")),
        );

      expect(found).toEqual([...labels]);
    }).toPass({ timeout: SESSION_SETTLE_MS });
  }

  async chooseFromActions(exercise: string, item: string): Promise<void> {
    const trigger = this.actionsOf(exercise);
    const menu = this.page.locator("[role='menu'][data-state='open']");

    await trigger.focus();
    await this.page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await expect(async () => {
      const focused = await this.page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? "",
      );

      if (!focused.startsWith(item)) {
        await this.page.keyboard.press("ArrowDown");
      }
      expect(focused).toMatch(new RegExp(`^${item}`));
    }).toPass({ timeout: SESSION_SETTLE_MS });
    await this.page.keyboard.press("Enter");
  }

  async expectActionsFocused(exercise: string): Promise<void> {
    await expect(this.actionsOf(exercise)).toBeFocused();
  }

  async ungroupByKeyboard(positions: string): Promise<void> {
    const ungroup = this.page.getByRole("button", {
      name: `Ungroup ${positions}`,
    });

    await ungroup.focus();
    await this.page.keyboard.press("Enter");
  }

  async expectSuperset(positions: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: `Ungroup ${positions}` }),
    ).toBeVisible();
  }

  async openDetails(exercise: string): Promise<void> {
    await this.cardOf(exercise)
      .getByRole("button", { name: `Details for ${exercise}` })
      .click();
  }

  async expectSubstitutionCount(
    exercise: string,
    count: number,
  ): Promise<void> {
    await expect(
      this.substitutionsOf(exercise).getByRole("button", { name: /^Remove / }),
    ).toHaveCount(count);
  }

  async substitutionNames(exercise: string): Promise<string[]> {
    const removers = this.substitutionsOf(exercise).getByRole("button", {
      name: /^Remove /,
    });

    await expect(removers.first()).toBeVisible();

    return removers.evaluateAll((buttons) =>
      buttons.map(
        (button) =>
          button.getAttribute("aria-label")?.slice("Remove ".length) ?? "",
      ),
    );
  }

  async removeSubstitution(
    exercise: string,
    substitution: string,
  ): Promise<void> {
    await this.substitutionsOf(exercise)
      .getByRole("button", { name: `Remove ${substitution}` })
      .click();
  }

  async suggestSubstitutions(exercise: string): Promise<void> {
    await this.substitutionsOf(exercise)
      .getByRole("button", { name: "Suggest" })
      .click();
  }

  async expectWarmUp(exercises: readonly string[]): Promise<void> {
    await expect(this.warmUp.getByRole("listitem")).toHaveText(
      exercises.map((exercise) => new RegExp(exercise)),
    );
  }

  async switchCoolDownOn(): Promise<void> {
    await this.coolDownSwitch.click();
    await expect(this.coolDownSwitch).toBeChecked();
  }

  async expectCoolDown(stretches: readonly string[]): Promise<void> {
    await expect(this.coolDown.getByRole("listitem")).toHaveText(
      stretches.map((stretch) => new RegExp(stretch)),
    );
  }
}
