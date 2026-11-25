import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const SESSION_NAME = "Session name";

export class ProgramSessionPage {
  constructor(private readonly page: Page) {}

  private get week(): Locator {
    return this.page.getByRole("region", { name: "Week", exact: true });
  }

  private get nameField(): Locator {
    return this.page.getByRole("textbox", { name: SESSION_NAME });
  }

  private get searchField(): Locator {
    return this.page.getByRole("searchbox", { name: "Search exercises" });
  }

  private get libraryDrawer(): Locator {
    return this.page.getByRole("dialog", { name: "Exercise library" });
  }

  private card(exercise: string): Locator {
    return this.page.locator(`article[aria-label$=" ${exercise}"]`);
  }

  private actionsOf(exercise: string): Locator {
    return this.page.getByRole("button", { name: `${exercise} actions` });
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

  private libraryEntry(exercise: string): Locator {
    return this.page
      .getByRole("list", { name: "Exercises", exact: true })
      .getByRole("listitem")
      .filter({ hasText: exercise })
      .locator("div.cursor-grab")
      .first();
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

  async addFromLibrary(slot: string, exercise: string): Promise<void> {
    await this.addButtonFor(slot).click();
    await this.page
      .getByRole("button", { name: `Add ${exercise}`, exact: true })
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
    }).toPass({ timeout: 5_000 });
  }

  async expectAnnounced(message: string): Promise<void> {
    await expect(
      this.page.getByRole("status").filter({ hasText: message }),
    ).toHaveCount(1);
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
    }).toPass({ timeout: 5_000 });
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

  async expectLibraryDrawerOpen(): Promise<void> {
    await expect(this.libraryDrawer).toBeVisible();
  }

  async expectLibraryDrawerClosed(): Promise<void> {
    await expect(this.libraryDrawer).toHaveCount(0);
  }

  async expectLibraryAddingTo(destination: string): Promise<void> {
    await expect(this.searchField).toHaveAccessibleDescription(
      `Adding to ${destination}`,
    );
  }

  async searchLibrary(query: string): Promise<void> {
    await this.searchField.fill(query);
  }

  async expectNoMatchChips(chips: readonly string[]): Promise<void> {
    await expect(
      this.page
        .getByRole("list", { name: "Active filters" })
        .getByRole("listitem"),
    ).toHaveText(chips.map((chip) => new RegExp(chip)));
  }

  async removeFilterChip(name: string): Promise<void> {
    await this.page
      .getByRole("button", { name: `Remove filter ${name}` })
      .click();
  }

  async expectFiltersButton(label: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }

  async dragLibraryExerciseOnto(
    exercise: string,
    target: "card" | "zone",
    targetName: string,
  ): Promise<void> {
    const source = await this.libraryEntry(exercise).boundingBox();
    const destination = await (
      target === "card"
        ? this.card(targetName)
        : this.page.getByRole("region", { name: targetName })
    ).boundingBox();

    if (!source || !destination) throw new Error("Nothing to drag on screen.");
    const fromX = source.x + source.width - 14;
    const fromY = source.y + source.height / 2;
    const toX = destination.x + destination.width / 2;
    const toY = destination.y + destination.height / 2;

    await this.page.mouse.move(fromX, fromY);
    await this.page.mouse.down();
    for (let step = 1; step <= 30; step += 1) {
      await this.page.mouse.move(
        fromX + ((toX - fromX) * step) / 30,
        fromY + ((toY - fromY) * step) / 30,
      );
    }
    await this.page.mouse.up();
  }

  async expectSuperset(positions: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: `Ungroup ${positions}` }),
    ).toBeVisible();
  }

  async openClientProfileFromDraftActions(): Promise<void> {
    await this.page.getByRole("button", { name: "Draft actions" }).click();
    await this.page.getByRole("menuitem", { name: "Client profile" }).click();
  }

  async expectClientProfile(facts: readonly string[]): Promise<void> {
    const profile = this.page.getByRole("dialog");

    for (const fact of facts) await expect(profile).toContainText(fact);
  }

  async expectProgramCardBlock(block: string, sessions: string): Promise<void> {
    await expect(
      this.page
        .getByRole("region", { name: "Program", exact: true })
        .getByRole("list", { name: "Blocks", exact: true })
        .getByRole("listitem")
        .filter({ hasText: block }),
    ).toContainText(sessions);
  }
}
