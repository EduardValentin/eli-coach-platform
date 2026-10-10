import { expect, type Locator, type Page } from "@playwright/test";

import { isFocused, tabTo } from "./keyboard";

export class TagField {
  constructor(
    private readonly page: Page,
    private readonly dialog: Locator,
  ) {}

  private get entry() {
    return this.dialog.getByRole("combobox", {
      name: "Tags (optional)",
      exact: true,
    });
  }

  private get chips() {
    return this.dialog
      .getByRole("list", { name: "Chosen tags", exact: true })
      .getByRole("listitem");
  }

  private get suggestions() {
    return this.page.getByRole("listbox", {
      name: "Tag suggestions",
      exact: true,
    });
  }

  private suggestion(name: string): Locator {
    return this.suggestions.getByRole("option", { name, exact: true });
  }

  private async idOf(locator: Locator): Promise<string> {
    const id = await locator.getAttribute("id");

    if (!id) throw new Error("The tag field's element carries no id.");

    return id;
  }

  async focusWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.entry);
  }

  async type(text: string): Promise<void> {
    if (!(await isFocused(this.entry))) await this.entry.click();

    await this.page.keyboard.type(text);
  }

  async chooseSuggestion(tag: string): Promise<void> {
    await this.suggestion(tag).click();
  }

  async create(tag: string): Promise<void> {
    await this.type(tag);
    await this.suggestion(`Create “${tag}”`).click();
  }

  async commitWithEnter(): Promise<void> {
    await this.page.keyboard.press("Enter");
  }

  async commitWithComma(): Promise<void> {
    await this.page.keyboard.press(",");
  }

  async removeLast(): Promise<void> {
    await expect(this.entry).toHaveValue("");
    await this.page.keyboard.press("Backspace");
  }

  async remove(tag: string): Promise<void> {
    await tabTo(
      this.page,
      this.dialog.getByRole("button", { name: `Remove ${tag}`, exact: true }),
    );
    await this.page.keyboard.press("Enter");
  }

  async expectChips(tags: readonly string[]): Promise<void> {
    await expect(this.chips).toHaveText([...tags]);
  }

  async expectSuggestions(options: readonly string[]): Promise<void> {
    await expect(this.suggestions.getByRole("option")).toHaveText([...options]);
  }

  async leave(): Promise<void> {
    await this.dialog.getByRole("heading", { level: 3 }).click();
    await expect(this.suggestions).toBeHidden();
    await expect(this.entry).not.toBeFocused();
  }

  async moveDown(): Promise<void> {
    await this.page.keyboard.press("ArrowDown");
  }

  async expectCollapsedCombobox(): Promise<void> {
    await expect(this.entry).toHaveAttribute("aria-autocomplete", "list");
    await expect(this.entry).toHaveAttribute("aria-expanded", "false");
    await expect(this.entry).not.toHaveAttribute("aria-controls");
    await expect(this.entry).not.toHaveAttribute("aria-activedescendant");
    await expect(this.suggestions).toHaveCount(0);
  }

  async expectActiveSuggestion(name: string): Promise<void> {
    await expect(this.entry).toHaveAttribute("aria-expanded", "true");
    await expect(this.entry).toHaveAttribute(
      "aria-controls",
      await this.idOf(this.suggestions),
    );
    await expect(this.entry).toHaveAttribute(
      "aria-activedescendant",
      await this.idOf(this.suggestion(name)),
    );
    await expect(this.suggestion(name)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      this.suggestions.locator('[role="option"][aria-selected="true"]'),
    ).toHaveCount(1);
  }

  async expectRemoveButtons(tags: readonly string[]): Promise<void> {
    const removeButtons = this.chips.getByRole("button");

    await expect(removeButtons).toHaveCount(tags.length);

    for (const [position, tag] of tags.entries()) {
      await expect(removeButtons.nth(position)).toHaveAccessibleName(
        `Remove ${tag}`,
      );
    }
  }

  async expectEntry(text: string): Promise<void> {
    await expect(this.entry).toHaveValue(text);
    await expect(this.entry).toBeFocused();
  }

  async closeSuggestions(): Promise<void> {
    await expect(this.suggestions).toBeVisible();
    await this.page.keyboard.press("Escape");
    await expect(this.suggestions).toBeHidden();
    await expect(this.entry).toBeFocused();
  }
}
