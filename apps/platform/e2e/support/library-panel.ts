import { expect, type Locator, type Page } from "@playwright/test";

import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const DRAG_STEPS = 30;
const GRAB_INSET_PX = 14;

export class LibraryPanel {
  constructor(private readonly page: Page) {}

  private get pane(): Locator {
    return this.page.getByRole("complementary", { name: "Exercise library" });
  }

  private get drawer(): Locator {
    return this.page.getByRole("dialog", { name: "Exercise library" });
  }

  private get searchField(): Locator {
    return this.page.getByRole("searchbox", { name: "Search exercises" });
  }

  private get typeSelect(): Locator {
    return this.page.getByRole("combobox", { name: "Exercise type" });
  }

  private get filtersPanel(): Locator {
    return this.page.getByRole("dialog", { name: "Filters", exact: true });
  }

  private get listedExercises(): Locator {
    return this.page
      .getByRole("list", { name: "Exercises", exact: true })
      .getByRole("listitem");
  }

  private entryOf(exercise: string): Locator {
    return this.listedExercises.filter({ hasText: exercise }).first();
  }

  async expectPaneOpen(): Promise<void> {
    await expect(this.pane).toBeVisible();
  }

  async expectDrawerOpen(): Promise<void> {
    await expect(this.drawer).toBeVisible();
  }

  async expectDrawerClosed(): Promise<void> {
    await expect(this.drawer).toHaveCount(0);
  }

  async expectDrawerAnnounced(message: string | RegExp): Promise<void> {
    await expect(this.drawer.getByRole("status")).toHaveText(message);
  }

  async expectAddingTo(destination: string): Promise<void> {
    await expect(this.searchField).toHaveAccessibleDescription(
      `Adding to ${destination}`,
    );
  }

  async expectAddingSubstitutionFor(exercise: string): Promise<void> {
    await expect(this.searchField).toHaveAccessibleDescription(
      `Adding a substitution for ${exercise}`,
    );
  }

  async closeDrawer(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await this.expectDrawerClosed();
  }

  async expectType(label: string): Promise<void> {
    await expect(this.typeSelect).toHaveText(label);
  }

  async chooseType(label: string): Promise<void> {
    await this.typeSelect.click();
    await this.page.getByRole("option", { name: label, exact: true }).click();
    await this.expectType(label);
  }

  async search(query: string): Promise<void> {
    await this.searchField.fill(query);
  }

  async expectActiveFilterChips(chips: readonly string[]): Promise<void> {
    await expect(
      this.page
        .getByRole("list", { name: "Active filters" })
        .getByRole("listitem"),
    ).toHaveText(chips.map((chip) => new RegExp(chip)));
  }

  async expectNoMatches(): Promise<void> {
    await expect(
      this.page.getByText("No matches", { exact: true }),
    ).toBeVisible();
  }

  async expectEmptyType(label: string): Promise<void> {
    await expect(
      this.page.getByText(`No ${label.toLowerCase()} exercises yet.`),
    ).toBeVisible();
  }

  async removeFilterChip(name: string): Promise<void> {
    await this.page
      .getByRole("button", { name: `Remove filter ${name}` })
      .click();
  }

  async clearFiltersFromNoMatches(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
  }

  async expectFiltersButton(label: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  }

  async openFilters(): Promise<void> {
    await expect(async () => {
      await this.page.getByRole("button", { name: /^Filters/ }).click();
      await expect(this.filtersPanel).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async switchFilter(label: string): Promise<void> {
    await this.filtersPanel.getByRole("switch", { name: label }).click();
  }

  async closeFilters(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.filtersPanel).toBeHidden();
  }

  async add(exercise: string): Promise<void> {
    await this.page
      .getByRole("button", { name: `Add ${exercise}`, exact: true })
      .click();
  }

  async dragOnto(exercise: string, target: Locator): Promise<void> {
    const source = await this.entryOf(exercise).boundingBox();
    const destination = await target.boundingBox();

    if (!source || !destination) throw new Error("Nothing to drag on screen.");
    const fromX = source.x + source.width - GRAB_INSET_PX;
    const fromY = source.y + source.height / 2;
    const toX = destination.x + destination.width / 2;
    const toY = destination.y + destination.height / 2;

    await this.page.mouse.move(fromX, fromY);
    await this.page.mouse.down();
    for (let step = 1; step <= DRAG_STEPS; step += 1) {
      await this.page.mouse.move(
        fromX + ((toX - fromX) * step) / DRAG_STEPS,
        fromY + ((toY - fromY) * step) / DRAG_STEPS,
      );
    }
    await this.page.mouse.up();
  }
}
