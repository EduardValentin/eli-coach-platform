import { expect, type Locator, type Page } from "@playwright/test";

import { expectAccessRefused } from "./control-states";
import { isFocused, tabTo } from "./keyboard";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type ListedExercise = {
  name: string;
  summary: string;
  tags: readonly string[];
  primaryMuscles: readonly string[];
  difficulty: string;
  video?: "Attached" | "—";
};

export type ListingFilter = "Type" | "Tags" | "Equipment";

type SingleChoiceFilter = Exclude<ListingFilter, "Tags">;

export type SortableColumn = "Exercise" | "Difficulty";

export type SortDirection = "ascending" | "descending";

export type OptionCounts = Readonly<Record<string, number>>;

const LIBRARY_PATH = "/coach/training";

const SORTABLE_COLUMNS: readonly SortableColumn[] = ["Exercise", "Difficulty"];

const TAGS_TRIGGER_NAME = /^Tags(, \d+ selected)?$/;

const PAGE_PARAM = "page";

const SEARCH_PARAM = "q";

const MAX_OPTION_STOPS = 10;

export class ExerciseLibraryPage {
  constructor(private readonly page: Page) {}

  private get navigation() {
    return this.page.getByRole("navigation", {
      name: "Coach portal navigation",
    });
  }

  private get phoneMenu() {
    return this.page.getByRole("dialog", {
      name: "Coach portal mobile navigation",
    });
  }

  private get trainingLink(): Locator {
    return this.navigation.getByRole("link", { name: "Training" });
  }

  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  private get newExerciseLink() {
    return this.page.getByRole("link", { name: "New exercise" });
  }

  private get editItem(): Locator {
    return this.page.getByRole("menuitem", { name: "Edit" });
  }

  private get editorHeading(): Locator {
    return this.page.getByRole("heading", { level: 1, name: "Edit exercise" });
  }

  private get rows(): Locator {
    return this.page.getByRole("table").getByRole("row");
  }

  private get exerciseNames() {
    return this.rows.locator("td:first-child p:first-child");
  }

  private async expectTrainingRightAfterDashboardIn(
    menu: Locator,
  ): Promise<void> {
    const links = menu.getByRole("link");

    await expect(links.nth(0)).toHaveAccessibleName("Dashboard");
    await expect(links.nth(1)).toHaveAccessibleName("Training");
  }

  private rowOf(name: string): Locator {
    return this.rows.filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  private actionsTriggerOf(name: string): Locator {
    return this.page.getByRole("button", { name: `Actions for ${name}` });
  }

  private get searchField(): Locator {
    return this.page.getByRole("searchbox", { name: "Search exercises" });
  }

  private get pager(): Locator {
    return this.page.getByRole("navigation", { name: "pagination" });
  }

  private get noMatchTitle(): Locator {
    return this.page.getByText("No exercises match", { exact: true });
  }

  private get clearFiltersButton(): Locator {
    return this.page.getByRole("button", { name: "Clear filters" });
  }

  private get tagsPanel(): Locator {
    return this.page.getByRole("dialog", { name: "Tags" });
  }

  private get choicePanel(): Locator {
    return this.page.getByRole("listbox");
  }

  private filterTrigger(filter: ListingFilter): Locator {
    if (filter === "Tags") {
      return this.page.getByRole("button", { name: TAGS_TRIGGER_NAME });
    }

    return this.page.getByRole("combobox", { name: filter, exact: true });
  }

  private filterPanel(filter: ListingFilter): Locator {
    return filter === "Tags" ? this.tagsPanel : this.choicePanel;
  }

  private filterOptions(filter: ListingFilter): Locator {
    return filter === "Tags"
      ? this.tagsPanel.getByRole("checkbox")
      : this.choicePanel.getByRole("option");
  }

  private filterOption(filter: ListingFilter, label: string): Locator {
    const name = new RegExp(`^${escapedPattern(label)}\\s*\\d+$`);

    return filter === "Tags"
      ? this.tagsPanel.getByRole("checkbox", { name })
      : this.choicePanel.getByRole("option", { name });
  }

  private columnHead(column: SortableColumn): Locator {
    return this.page.getByRole("columnheader", { name: column, exact: true });
  }

  private sortButtonOf(column: SortableColumn): Locator {
    return this.columnHead(column).getByRole("button", {
      name: column,
      exact: true,
    });
  }

  private pageLink(page: number): Locator {
    return this.pager.getByRole("link", {
      name: `Go to page ${page}`,
      exact: true,
    });
  }

  private async openFilter(filter: ListingFilter): Promise<void> {
    await expect(async () => {
      await this.filterTrigger(filter).click();
      await expect(this.filterPanel(filter)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async openFilterWithKeyboard(filter: ListingFilter): Promise<void> {
    await expect(async () => {
      await this.tabFromHeadingTo(this.filterTrigger(filter));
      await this.page.keyboard.press("Enter");
      await expect(this.filterPanel(filter)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async closeFilter(filter: ListingFilter): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.filterPanel(filter)).toBeHidden();
  }

  private async choose(filter: SingleChoiceFilter, label: string) {
    await this.openFilter(filter);
    await this.filterOption(filter, label).click();
    await expect(this.filterPanel(filter)).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(label);
  }

  private async chooseWithKeyboard(filter: SingleChoiceFilter, label: string) {
    await this.openFilterWithKeyboard(filter);
    await expect(
      this.choicePanel.getByRole("option", { selected: true }),
    ).toBeFocused();
    await this.arrowDownTo(this.filterOption(filter, label));
    await this.page.keyboard.press("Enter");
    await expect(this.filterPanel(filter)).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(label);
    await expect(this.filterTrigger(filter)).toBeFocused();
  }

  private async arrowDownTo(option: Locator): Promise<void> {
    for (let stop = 0; stop < MAX_OPTION_STOPS; stop += 1) {
      if (await isFocused(option)) return;
      await this.page.keyboard.press("ArrowDown");
    }

    throw new Error("The arrow keys never reached the expected option.");
  }

  private async tabFromHeadingTo(control: Locator): Promise<void> {
    await this.heading.click({ position: { x: 1, y: 1 } });
    await tabTo(this.page, control);
  }

  private async expectSearchSettledOn(term: string): Promise<void> {
    await expect(this.page).toHaveURL(
      (url) => (url.searchParams.get(SEARCH_PARAM) ?? "") === term,
      { timeout: HYDRATION_RETRY_TIMEOUT_MS },
    );
  }

  private async expectOnPage(page: number): Promise<void> {
    await expect(this.page).toHaveURL(
      (url) =>
        url.searchParams.get(PAGE_PARAM) === (page === 1 ? null : `${page}`),
    );
  }

  private async expectSortChangedFrom(
    column: SortableColumn,
    previous: string | null,
  ): Promise<void> {
    await expect(this.columnHead(column)).not.toHaveAttribute(
      "aria-sort",
      previous ?? "",
      { timeout: HYDRATION_RETRY_TIMEOUT_MS },
    );
  }

  async open(): Promise<void> {
    await this.page.goto(LIBRARY_PATH);
  }

  async openFromNavigation(): Promise<void> {
    await this.trainingLink.click();
    await this.expectOpen();
  }

  async expectOpen(search = ""): Promise<void> {
    await expect(this.page).toHaveURL(`${LIBRARY_PATH}${search}`);
    await expect(this.heading).toHaveText("Exercises");
  }

  async expectTrainingRightAfterDashboard(): Promise<void> {
    await this.expectTrainingRightAfterDashboardIn(this.navigation);
    await expect(this.trainingLink).toHaveAttribute("aria-current", "page");
  }

  async openPhoneMenu(): Promise<void> {
    await expect(async () => {
      await this.page
        .getByRole("banner", { name: "Coach portal top bar" })
        .getByRole("button", { name: "Open menu" })
        .click();
      await expect(this.phoneMenu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectPhoneMenuTrainingRightAfterDashboard(): Promise<void> {
    await this.expectTrainingRightAfterDashboardIn(this.phoneMenu);
  }

  async openFromPhoneMenu(): Promise<void> {
    await this.phoneMenu.getByRole("link", { name: "Training" }).click();
    await this.expectOpen();
    await expect(this.phoneMenu).toBeHidden();
  }

  async startNewExercise(): Promise<void> {
    await this.newExerciseLink.click();
  }

  async startNewExerciseWithKeyboard(): Promise<void> {
    await this.heading.click({ position: { x: 1, y: 1 } });
    await tabTo(this.page, this.newExerciseLink);
    await this.page.keyboard.press("Enter");
  }

  async expectRefused(): Promise<void> {
    await expectAccessRefused(this.page);
  }

  async chooseType(label: string): Promise<void> {
    await this.choose("Type", label);
  }

  async chooseEquipment(label: string): Promise<void> {
    await this.choose("Equipment", label);
  }

  async toggleTag(label: string): Promise<void> {
    const option = this.filterOption("Tags", label);

    await this.openFilter("Tags");
    const wasChosen = await option.isChecked();
    await option.click();
    await expect(option).toBeChecked({ checked: !wasChosen });
    await this.closeFilter("Tags");
  }

  async chooseTypeWithKeyboard(label: string): Promise<void> {
    await this.chooseWithKeyboard("Type", label);
  }

  async chooseEquipmentWithKeyboard(label: string): Promise<void> {
    await this.chooseWithKeyboard("Equipment", label);
  }

  async toggleTagWithKeyboard(label: string): Promise<void> {
    const option = this.filterOption("Tags", label);

    await this.openFilterWithKeyboard("Tags");
    const wasChosen = await option.isChecked();
    await tabTo(this.page, option);
    await this.page.keyboard.press("Space");
    await expect(option).toBeChecked({ checked: !wasChosen });
    await this.page.keyboard.press("Escape");
    await expect(this.tagsPanel).toBeHidden();
    await expect(this.filterTrigger("Tags")).toBeFocused();
  }

  async expectOptionCounts(
    filter: ListingFilter,
    counts: OptionCounts,
  ): Promise<void> {
    const entries = Object.entries(counts);

    await this.openFilter(filter);
    await expect(this.filterOptions(filter)).toHaveCount(entries.length);
    for (const [label, count] of entries) {
      await expect(this.filterOption(filter, label)).toHaveAccessibleName(
        new RegExp(`^${escapedPattern(label)}\\s*${count}$`),
      );
    }
    await this.closeFilter(filter);
  }

  async expectChosen(filter: SingleChoiceFilter, label: string) {
    await expect(this.filterTrigger(filter)).toHaveText(label);
  }

  async expectTagsChosen(labels: readonly string[]): Promise<void> {
    await this.openFilter("Tags");
    await expect(
      this.tagsPanel.getByRole("checkbox", { checked: true }),
    ).toHaveCount(labels.length);
    for (const label of labels) {
      await expect(this.filterOption("Tags", label)).toBeChecked();
    }
    await this.closeFilter("Tags");
  }

  async search(term: string): Promise<void> {
    await expect(async () => {
      await this.searchField.fill(term);
      await this.expectSearchSettledOn(term);
    }).toPass();
  }

  async searchWithKeyboard(term: string): Promise<void> {
    await expect(async () => {
      await this.tabFromHeadingTo(this.searchField);
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.insertText(term);
      await this.expectSearchSettledOn(term);
    }).toPass();
  }

  async expectSearch(term: string): Promise<void> {
    await expect(this.searchField).toHaveValue(term);
  }

  async sortBy(column: SortableColumn): Promise<void> {
    const previous = await this.columnHead(column).getAttribute("aria-sort");

    await expect(async () => {
      await this.sortButtonOf(column).click();
      await this.expectSortChangedFrom(column, previous);
    }).toPass();
  }

  async sortByWithKeyboard(column: SortableColumn): Promise<void> {
    const previous = await this.columnHead(column).getAttribute("aria-sort");

    await expect(async () => {
      await this.tabFromHeadingTo(this.sortButtonOf(column));
      await this.page.keyboard.press("Enter");
      await this.expectSortChangedFrom(column, previous);
    }).toPass();
  }

  async expectSortedBy(
    column: SortableColumn,
    direction: SortDirection,
  ): Promise<void> {
    await expect(this.columnHead(column)).toHaveAttribute(
      "aria-sort",
      direction,
    );
    for (const other of SORTABLE_COLUMNS.filter((head) => head !== column)) {
      await expect(this.columnHead(other)).toHaveAttribute("aria-sort", "none");
    }
  }

  async goToPage(page: number): Promise<void> {
    await this.pageLink(page).click();
    await this.expectOnPage(page);
  }

  async goToPageWithKeyboard(page: number): Promise<void> {
    await this.tabFromHeadingTo(this.pageLink(page));
    await this.page.keyboard.press("Enter");
    await this.expectOnPage(page);
  }

  async expectShowing(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectNoPager(): Promise<void> {
    await expect(this.pager).toHaveCount(0);
  }

  async expectNoMatch(): Promise<void> {
    await expect(this.noMatchTitle).toBeVisible();
    await expect(
      this.page.getByText("Try another filter or search.", { exact: true }),
    ).toBeVisible();
    await expect(this.clearFiltersButton).toBeVisible();
  }

  async clearFilters(): Promise<void> {
    await expect(async () => {
      await this.clearFiltersButton.click();
      await expect(this.noMatchTitle).toBeHidden({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectAddressParams(params: Readonly<Record<string, string>>) {
    await expect
      .poll(() => {
        const address = new URL(this.page.url());

        return {
          path: address.pathname,
          params: Object.fromEntries(address.searchParams),
        };
      })
      .toEqual({ path: LIBRARY_PATH, params });
  }

  async expectListedNamesExactly(names: readonly string[]): Promise<void> {
    await expect(this.exerciseNames).toHaveText(names);
  }

  async expectListedInOrder(names: readonly string[]): Promise<void> {
    const listed = await this.exerciseNames.allInnerTexts();

    expect(listed.filter((name) => names.includes(name))).toEqual(names);
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
      exercise.video ?? "—",
      "",
    ]);
  }

  async expectNotListed(name: string): Promise<void> {
    await expect(this.rowOf(name)).toHaveCount(0);
  }

  async edit(name: string): Promise<void> {
    await expect(async () => {
      await this.actionsTriggerOf(name).click({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
      await this.editItem.click({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
      await expect(this.editorHeading).toBeVisible();
    }).toPass();
  }
}
