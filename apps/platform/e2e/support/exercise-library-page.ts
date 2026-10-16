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

export type ExerciseStatusLabel = "Active" | "Archived";

export type ToolbarControl = ListingFilter | "Status";

type SingleChoiceControl = Exclude<ToolbarControl, "Tags">;

type SingleChoiceFilter = Exclude<ListingFilter, "Tags">;

type RowAction = "Edit" | "Archive" | "Restore" | "Delete";

export type SortableColumn = "Exercise" | "Difficulty";

export type SortDirection = "ascending" | "descending";

export type OptionCounts = Readonly<Record<string, number>>;

const LIBRARY_PATH = "/coach/training";

const SORTABLE_COLUMNS: readonly SortableColumn[] = ["Exercise", "Difficulty"];

const TAGS_TRIGGER_NAME = /^Tags(, \d+ selected)?$/;

const PAGE_PARAM = "page";

const SEARCH_PARAM = "q";

const ARROW_SETTLE_MS = 250;

const HUMAN_KEYSTROKE_DELAY_MS = 60;

const DELETE_DIALOG_NAME = /^Delete “.+”\?$/;

const DELETE_DESCRIPTION = "It’s removed for good. This can’t be undone.";

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

  private get rowMenu(): Locator {
    return this.page.getByRole("menu");
  }

  private rowMenuItem(action: RowAction): Locator {
    return this.rowMenu.getByRole("menuitem", { name: action, exact: true });
  }

  private get deleteDialog(): Locator {
    return this.page.getByRole("dialog", { name: DELETE_DIALOG_NAME });
  }

  private deleteDialogButton(label: "Delete" | "Cancel"): Locator {
    return this.deleteDialog.getByRole("button", { name: label, exact: true });
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

  private get noExercisesTitle(): Locator {
    return this.page.getByText("No exercises yet", { exact: true });
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

  private filterTrigger(filter: ToolbarControl): Locator {
    if (filter === "Tags") {
      return this.page.getByRole("button", { name: TAGS_TRIGGER_NAME });
    }

    return this.page.getByRole("combobox", { name: filter, exact: true });
  }

  private filterPanel(filter: ToolbarControl): Locator {
    return filter === "Tags" ? this.tagsPanel : this.choicePanel;
  }

  private filterOptions(filter: ToolbarControl): Locator {
    return filter === "Tags"
      ? this.tagsPanel.getByRole("checkbox")
      : this.choicePanel.getByRole("option");
  }

  private filterOption(filter: ToolbarControl, label: string): Locator {
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

  private async openFilter(filter: ToolbarControl): Promise<void> {
    await expect(async () => {
      await this.filterTrigger(filter).click();
      await expect(this.filterPanel(filter)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async openFilterWithKeyboard(filter: ToolbarControl): Promise<void> {
    await expect(async () => {
      await this.tabFromHeadingTo(this.filterTrigger(filter));
      await this.page.keyboard.press("Enter");
      await expect(this.filterPanel(filter)).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async closeFilter(filter: ToolbarControl): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.filterPanel(filter)).toBeHidden();
  }

  private async choose(filter: SingleChoiceControl, label: string) {
    await this.openFilter(filter);
    await this.filterOption(filter, label).click();
    await expect(this.filterPanel(filter)).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(label);
  }

  private async chooseWithKeyboard(filter: SingleChoiceControl, label: string) {
    await this.openFilterWithKeyboard(filter);
    await expect(
      this.choicePanel.getByRole("option", { selected: true }),
    ).toBeFocused();
    await this.page.keyboard.press("Home");
    await expect(this.filterOptions(filter).first()).toBeFocused();
    await this.arrowDownTo(this.filterOption(filter, label));
    await this.page.keyboard.press("Enter");
    await expect(this.filterPanel(filter)).toBeHidden();
    await expect(this.filterTrigger(filter)).toHaveText(label);
    await expect(this.filterTrigger(filter)).toBeFocused();
  }

  private async arrowDownTo(target: Locator): Promise<void> {
    await expect(async () => {
      if (!(await isFocused(target))) {
        await this.page.keyboard.press("ArrowDown");
      }
      expect(await isFocused(target)).toBe(true);
    }).toPass({ intervals: [ARROW_SETTLE_MS] });
  }

  private async chooseRowAction(name: string, action: RowAction) {
    await expect(async () => {
      await this.actionsTriggerOf(name).click({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
      await this.rowMenuItem(action).click({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async chooseRowActionWithKeyboard(name: string, action: RowAction) {
    await expect(async () => {
      if (!(await this.rowMenu.isVisible())) {
        await this.tabFromHeadingTo(this.actionsTriggerOf(name));
        await this.page.keyboard.press("Enter");
      }
      await expect(this.rowMenu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await expect(this.rowMenu.getByRole("menuitem").first()).toBeFocused();
    await this.arrowDownTo(this.rowMenuItem(action));
    await this.page.keyboard.press("Enter");
  }

  private async expectDeleteAsked(name: string): Promise<void> {
    await expect(this.deleteDialog).toHaveAccessibleName(`Delete “${name}”?`);
    await expect(this.deleteDialog).toHaveAccessibleDescription(
      DELETE_DESCRIPTION,
    );
    await expect(this.deleteDialogButton("Delete")).toBeEnabled();
    await expect(this.deleteDialogButton("Cancel")).toBeEnabled();
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
    filter: ToolbarControl,
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

  async chooseStatus(label: ExerciseStatusLabel): Promise<void> {
    await this.choose("Status", label);
  }

  async chooseStatusWithKeyboard(label: ExerciseStatusLabel): Promise<void> {
    await this.chooseWithKeyboard("Status", label);
  }

  async expectStatusCounts(
    counts: Readonly<Record<ExerciseStatusLabel, number>>,
  ): Promise<void> {
    await this.expectOptionCounts("Status", counts);
  }

  async expectStatusAfterEquipmentBeforeSearch(): Promise<void> {
    await this.tabFromHeadingTo(this.filterTrigger("Equipment"));
    await this.page.keyboard.press("Tab");
    await expect(this.filterTrigger("Status")).toBeFocused();
    await this.page.keyboard.press("Tab");
    await expect(this.searchField).toBeFocused();
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

  async typeSearch(term: string): Promise<void> {
    await this.searchField.fill("");
    await this.expectSearchSettledOn("");
    await this.searchField.pressSequentially(term, {
      delay: HUMAN_KEYSTROKE_DELAY_MS,
    });
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

  async expectNoExercisesYet(): Promise<void> {
    await expect(this.noExercisesTitle).toBeVisible();
    await expect(
      this.page.getByText("Exercises you add appear here.", { exact: true }),
    ).toBeVisible();
    await expect(this.noMatchTitle).toHaveCount(0);
    await expect(this.clearFiltersButton).toHaveCount(0);
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

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message, { exact: true })).toBeVisible();
  }

  async expectArchivedEmpty(): Promise<void> {
    await expect(
      this.page.getByText("No archived exercises", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        "Exercises you archive appear here, ready to restore.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(this.noMatchTitle).toHaveCount(0);
    await expect(this.clearFiltersButton).toHaveCount(0);
  }

  async expectHeadingFocused(): Promise<void> {
    await expect(this.heading).toBeFocused();
  }

  async expectRowMenuButtonFocused(name: string): Promise<void> {
    await expect(this.actionsTriggerOf(name)).toBeFocused();
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
      await this.chooseRowAction(name, "Edit");
      await expect(this.editorHeading).toBeVisible();
    }).toPass();
  }

  async expectRowActions(
    name: string,
    actions: readonly RowAction[],
  ): Promise<void> {
    await expect(async () => {
      await this.actionsTriggerOf(name).click({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
      await expect(this.rowMenu.getByRole("menuitem")).toHaveText(actions, {
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.page.keyboard.press("Escape");
    await expect(this.rowMenu).toBeHidden();
  }

  async archive(name: string): Promise<void> {
    await this.chooseRowAction(name, "Archive");
  }

  async archiveWithKeyboard(name: string): Promise<void> {
    await this.chooseRowActionWithKeyboard(name, "Archive");
  }

  async restore(name: string): Promise<void> {
    await this.chooseRowAction(name, "Restore");
  }

  async restoreWithKeyboard(name: string): Promise<void> {
    await this.chooseRowActionWithKeyboard(name, "Restore");
  }

  async requestDelete(name: string): Promise<void> {
    await this.chooseRowAction(name, "Delete");
    await this.expectDeleteAsked(name);
  }

  async requestDeleteWithKeyboard(name: string): Promise<void> {
    await this.chooseRowActionWithKeyboard(name, "Delete");
    await this.expectDeleteAsked(name);
  }

  async confirmDelete(): Promise<void> {
    await this.deleteDialogButton("Delete").click();
    await expect(this.deleteDialog).toBeHidden();
  }

  async confirmDeleteWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.deleteDialogButton("Delete"));
    await this.page.keyboard.press("Enter");
    await expect(this.deleteDialog).toBeHidden();
  }

  async cancelDelete(): Promise<void> {
    await this.deleteDialogButton("Cancel").click();
    await expect(this.deleteDialog).toBeHidden();
  }

  async dismissDeleteWithEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.deleteDialog).toBeHidden();
  }

  async dismissDeleteFromOutside(): Promise<void> {
    await this.page.mouse.click(1, 1);
    await expect(this.deleteDialog).toBeHidden();
  }

  async cancelDeleteWithKeyboard(): Promise<void> {
    await tabTo(this.page, this.deleteDialogButton("Cancel"));
    await this.page.keyboard.press("Enter");
    await expect(this.deleteDialog).toBeHidden();
  }
}
