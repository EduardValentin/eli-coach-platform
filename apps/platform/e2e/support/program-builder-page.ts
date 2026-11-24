import { expect, type Locator, type Page } from "@playwright/test";

import { tabTo } from "./keyboard";
import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type PlanRow = { type: string; weeks: string };

const OVERVIEW_PAINTED_KEY = "e2e-overview-painted";

const SAVE_REQUEST = /\/api\/coach\/clients\/[^/]+\/program\/draft$/;

export class ProgramBuilderPage {
  constructor(private readonly page: Page) {}

  private get sectionList(): Locator {
    return this.page.getByRole("navigation", { name: "Program sections" });
  }

  private get draftLine(): Locator {
    return this.page.getByText(/ · v\d+ draft/);
  }

  private get blockRows(): Locator {
    return this.page
      .getByRole("main")
      .getByRole("list", { name: "Blocks", exact: true })
      .locator(":scope > li");
  }

  private get week(): Locator {
    return this.page.getByRole("region", { name: "Week", exact: true });
  }

  private select(name: string): Locator {
    return this.page.getByRole("combobox", { name, exact: true });
  }

  private dayCard(weekday: string): Locator {
    return this.week.getByRole("listitem").filter({
      has: this.page.getByRole("heading", { name: weekday, exact: true }),
    });
  }

  async open(clientId: string): Promise<void> {
    await this.page.goto(`/coach/clients/${clientId}/program/draft`);
  }

  async expectOpenFor(fullName: string, clientId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/coach/clients/${clientId}/program/draft(#.*)?$`),
    );
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
    await expect(this.draftLine).toHaveText(
      new RegExp(`^${escapedPattern(fullName)} · v1 draft`),
    );
  }

  async expectNoProgramYet(clientId: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "No program yet" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Set up program" }),
    ).toHaveAttribute("href", `/coach/clients/${clientId}/program/new`);
  }

  async expectPlan(rows: readonly PlanRow[]): Promise<void> {
    await expect(this.blockRows).toHaveCount(rows.length);

    for (const [index, row] of rows.entries()) {
      const position = index + 1;
      await expect(this.select(`Type of block ${position}`)).toHaveText(
        row.type,
      );
      await expect(
        this.page.getByRole("spinbutton", {
          name: `Weeks of block ${position}`,
        }),
      ).toHaveValue(row.weeks);
    }
  }

  async moveBlockUpByKeyboard(type: string): Promise<void> {
    const handle = this.page.getByRole("button", {
      name: `Reorder ${type} block`,
    });

    await expect(async () => {
      await handle.focus();
      await this.page.keyboard.press("ArrowUp");
      await expect(this.page.getByRole("status")).toContainText(
        `${type} block moved`,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
    await expect(handle).toBeFocused();
  }

  async expectAnnounced(message: string): Promise<void> {
    await expect(this.page.getByRole("status")).toHaveText(message);
  }

  async addProposedBlock(): Promise<void> {
    await expect(async () => {
      await this.sectionList.getByRole("button", { name: "Add block" }).click();
      await expect(
        this.page.getByRole("dialog", { name: "Add a block" }),
      ).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
    await this.page
      .getByRole("dialog", { name: "Add a block" })
      .getByRole("button", { name: "Add block" })
      .click();
  }

  async openBlockFromSections(position: number, type: string): Promise<void> {
    await this.sectionList
      .getByRole("button", {
        name: new RegExp(`^${position}\\s?${escapedPattern(type)}`),
      })
      .click();
    await this.expectOnBlock(position, type);
  }

  // Watches every animation frame from the document's start, so a heading
  // painted only before hydration is still caught.
  async watchForOverviewPaint(): Promise<void> {
    await this.page.addInitScript((OVERVIEW_PAINTED_KEY) => {
      sessionStorage.removeItem(OVERVIEW_PAINTED_KEY);
      const watch = () => {
        const heading = document.querySelector("h1");
        if (
          heading?.textContent === "Overview" &&
          heading.checkVisibility({ visibilityProperty: true })
        ) {
          sessionStorage.setItem(OVERVIEW_PAINTED_KEY, "true");
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    }, OVERVIEW_PAINTED_KEY);
  }

  async expectNoOverviewPainted(): Promise<void> {
    const painted = await this.page.evaluate(
      (key) => sessionStorage.getItem(key),
      OVERVIEW_PAINTED_KEY,
    );

    expect(painted).toBeNull();
  }

  async openOverview(): Promise<void> {
    await this.page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("button", { name: "Overview" })
      .click();
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
  }

  async expectOnBlock(position: number, type: string): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: `Block ${position} · ${type}`,
      }),
    ).toBeVisible();
  }

  async chooseOption(field: string, option: string): Promise<void> {
    await this.select(field).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }

  private async confirmUnlessApplied(
    confirmLabel: string,
    applied: Locator,
  ): Promise<void> {
    const confirm = this.page.getByRole("button", {
      name: confirmLabel,
      exact: true,
    });

    await expect(confirm.or(applied).first()).toBeVisible();
    if (await confirm.isVisible()) await confirm.click();
    await expect(applied).toBeVisible();
  }

  async chooseTrainingDays(days: string): Promise<void> {
    await this.chooseOption("Training days", days);
    await this.confirmUnlessApplied(
      "Rebuild sessions",
      this.select("Training days").filter({ hasText: days }),
    );
  }

  async makeRestDay(weekday: string): Promise<void> {
    await this.page.getByRole("button", { name: `${weekday} options` }).click();
    await this.page
      .getByRole("menuitem", { name: "Rest", exact: true })
      .click();
    await this.confirmUnlessApplied(
      "Change day",
      this.dayCard(weekday).filter({ hasText: "Rest" }),
    );
  }

  async expectDay(weekday: string, plan: string): Promise<void> {
    await expect(this.dayCard(weekday)).toContainText(plan);
  }

  async expectTrainingDays(days: string): Promise<void> {
    await expect(this.select("Training days")).toHaveText(days);
  }

  async chooseLevel(level: string): Promise<void> {
    await expect(async () => {
      await this.select("Level").click();
      await expect(
        this.page.getByRole("option", { name: level, exact: true }),
      ).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
    await this.page.getByRole("option", { name: level, exact: true }).click();
  }

  async expectLevel(level: string): Promise<void> {
    await expect(this.select("Level")).toHaveText(level);
  }

  async expectSaved(): Promise<void> {
    await expect(this.draftLine).toHaveText(/ · Saved$/);
  }

  async expectSaveState(state: string): Promise<void> {
    await expect(this.draftLine).toContainText(`· ${state}`);
  }

  async failSaves(): Promise<void> {
    await this.page.route(SAVE_REQUEST, (route) =>
      route.fulfill({ status: 500, body: "" }),
    );
  }

  async letSavesThrough(): Promise<void> {
    await this.page.unroute(SAVE_REQUEST);
  }

  async expectFailedSave(): Promise<void> {
    await expect(this.page.getByRole("alert")).toContainText(
      "Your latest changes aren’t saved yet.",
    );
    await this.expectSaveState("Not saved");
  }

  async tryAgainNow(): Promise<void> {
    await this.page.getByRole("button", { name: "Try again now" }).click();
  }

  async expectRecovered(): Promise<void> {
    await expect(this.page.getByRole("alert")).toHaveCount(0);
    await this.expectSaved();
    await expect(this.page.getByRole("heading", { level: 1 })).toBeFocused();
  }

  async expectChangedElsewhere(): Promise<void> {
    await expect(
      this.page.getByRole("alertdialog", {
        name: "This draft changed elsewhere",
      }),
    ).toBeVisible();
    await this.expectSaveState("Changed elsewhere");
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  async reload(): Promise<void> {
    await this.page.getByRole("button", { name: "Reload" }).click();
    await expect(this.page.getByRole("alertdialog")).toHaveCount(0);
  }

  async goBackToClient(fullName: string): Promise<void> {
    await this.page.getByRole("link", { name: `Back to ${fullName}` }).click();
  }

  async expectLeaveWarning(): Promise<void> {
    await expect(
      this.page.getByRole("dialog", { name: "Unsaved changes" }),
    ).toBeVisible();
  }

  async keepEditing(fullName: string): Promise<void> {
    await this.page.getByRole("button", { name: "Keep editing" }).click();
    await expect(
      this.page.getByRole("link", { name: `Back to ${fullName}` }),
    ).toBeFocused();
  }

  async leaveWithoutSaving(): Promise<void> {
    await this.page
      .getByRole("button", { name: "Leave without saving" })
      .click();
  }

  private get addBlockDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Add a block" });
  }

  private confirmation(title: string): Locator {
    return this.page.getByRole("dialog", { name: title, exact: true });
  }

  private blockRow(position: number): Locator {
    return this.blockRows.nth(position - 1);
  }

  private blockWeeks(position: number): Locator {
    return this.page.getByRole("spinbutton", {
      name: `Weeks of block ${position}`,
    });
  }

  private dayMenu(weekday: string): Locator {
    return this.page.getByRole("button", { name: `${weekday} options` });
  }

  private menuItem(name: string): Locator {
    return this.page.getByRole("menuitem", { name, exact: true });
  }

  async expectSaving(): Promise<void> {
    await expect(this.draftLine).toHaveText(/ · Saving…$/);
  }

  async expectNoSaveState(): Promise<void> {
    await expect(this.draftLine).toHaveText(/ · v\d+ draft$/);
  }

  async chooseLanguage(language: string): Promise<void> {
    await this.chooseOption("Language", language);
  }

  async expectLanguage(language: string): Promise<void> {
    await expect(this.select("Language")).toHaveText(language);
  }

  async openTimelineWeek(name: string): Promise<void> {
    await this.page
      .getByRole("toolbar", { name: "Plan weeks" })
      .getByRole("button", { name, exact: true })
      .click();
  }

  async typeBlockWeeks(position: number, weeks: string): Promise<void> {
    await this.blockWeeks(position).fill(weeks);
  }

  async leaveBlockWeeks(position: number): Promise<void> {
    await this.blockWeeks(position).blur();
  }

  async expectBlockWeeks(position: number, weeks: string): Promise<void> {
    await expect(this.blockWeeks(position)).toHaveValue(weeks);
  }

  async expectBlockWeeksFixedAtOne(position: number): Promise<void> {
    await expect(this.blockWeeks(position)).toHaveValue("1");
    await expect(this.blockWeeks(position)).toBeDisabled();
    await expect(this.blockRow(position)).toContainText(
      "A deload is always 1 week",
    );
  }

  async chooseBlockType(position: number, type: string): Promise<void> {
    await this.chooseOption(`Type of block ${position}`, type);
  }

  async openAddBlockFromPlan(): Promise<void> {
    await this.page
      .getByRole("main")
      .getByRole("button", { name: "Add block", exact: true })
      .click();
    await expect(this.addBlockDialog).toBeVisible();
  }

  async expectProposedBlock(type: string, weeks: string): Promise<void> {
    await expect(
      this.addBlockDialog.getByRole("combobox", { name: "Type" }),
    ).toHaveText(type);
    await expect(
      this.addBlockDialog.getByRole("spinbutton", { name: "Weeks" }),
    ).toHaveValue(weeks);
  }

  async expectProposedWeeksFixed(): Promise<void> {
    await expect(
      this.addBlockDialog.getByRole("spinbutton", { name: "Weeks" }),
    ).toBeDisabled();
    await expect(this.addBlockDialog).toContainText("A Deload lasts one week");
  }

  async cancelAddBlock(): Promise<void> {
    await this.addBlockDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(this.addBlockDialog).toHaveCount(0);
    await expect(
      this.page
        .getByRole("main")
        .getByRole("button", { name: "Add block", exact: true }),
    ).toBeFocused();
  }

  async confirmAddBlock(): Promise<void> {
    await this.addBlockDialog
      .getByRole("button", { name: "Add block" })
      .click();
    await expect(this.addBlockDialog).toHaveCount(0);
  }

  async expectPlaceHeadingFocused(): Promise<void> {
    await expect(this.page.getByRole("heading", { level: 1 })).toBeFocused();
  }

  async expectProblemOnBlock(position: number, problem: string): Promise<void> {
    await expect(this.blockRow(position)).toContainText(problem);
  }

  async expectNoProblemOnBlock(
    position: number,
    problem: string,
  ): Promise<void> {
    await expect(this.blockRow(position)).not.toContainText(problem);
  }

  async askToRemoveBlockFromPlan(
    position: number,
    type: string,
  ): Promise<void> {
    await this.page
      .getByRole("button", { name: `Remove block ${position}, ${type}` })
      .click();
  }

  async expectConfirmationNaming(
    title: string,
    lost: readonly string[],
  ): Promise<void> {
    await expect(this.confirmation(title)).toBeVisible();
    for (const line of lost) {
      await expect(
        this.confirmation(title)
          .getByRole("listitem")
          .filter({ hasText: line })
          .first(),
      ).toBeVisible();
    }
  }

  async expectNoConfirmation(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toHaveCount(0);
  }

  async cancelConfirmation(title: string): Promise<void> {
    await this.confirmation(title)
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(this.confirmation(title)).toHaveCount(0);
  }

  async confirm(title: string, confirmLabel: string): Promise<void> {
    await this.confirmation(title)
      .getByRole("button", { name: confirmLabel, exact: true })
      .click();
    await expect(this.confirmation(title)).toHaveCount(0);
  }

  async expectRemoveButtonFocused(
    position: number,
    type: string,
  ): Promise<void> {
    await expect(
      this.page.getByRole("button", {
        name: `Remove block ${position}, ${type}`,
      }),
    ).toBeFocused();
  }

  async expectBlockOpenerFocused(
    position: number,
    type: string,
  ): Promise<void> {
    await expect(
      this.page.getByRole("button", {
        name: new RegExp(`^Open block ${position}, ${escapedPattern(type)}:`),
      }),
    ).toBeFocused();
  }

  async expectSuggestion(text: string): Promise<void> {
    await expect(this.blockRows).toHaveCount(0);
    await expect(this.page.getByRole("main")).toContainText(text);
  }

  async useSuggestion(): Promise<void> {
    await this.page.getByRole("button", { name: "Use suggestion" }).click();
  }

  async dragBlockAbove(type: string, targetPosition: number): Promise<void> {
    const handle = this.page.getByRole("button", {
      name: `Reorder ${type} block`,
    });
    const dropLine = this.blockRow(targetPosition).locator(
      "[data-parity=block-drop-line]",
    );
    const from = await handle.boundingBox();
    const to = await dropLine.boundingBox();
    if (!from || !to) throw new Error("The block rows are not on screen.");
    const x = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    const endY = to.y + to.height / 2;

    await expect(async () => {
      await this.page.mouse.move(x, startY);
      await this.page.mouse.down();
      for (let step = 1; step <= 10; step += 1) {
        await this.page.mouse.move(x, startY + ((endY - startY) * step) / 10);
      }
      await this.page.mouse.up();
      await expect(this.page.getByRole("status")).toContainText(
        `${type} block moved`,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  async sessionsOfDayMenu(weekday: string): Promise<string[]> {
    await this.dayMenu(weekday).click();
    await this.menuItem("Session").click();
    const sessions = this.page.getByRole("menu").last().getByRole("menuitem");
    await expect(sessions.first()).toBeVisible();
    const names = await sessions.allTextContents();
    await this.page.keyboard.press("Escape");
    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("menu")).toHaveCount(0);

    return names.map((name) => name.trim());
  }

  async putSessionOnDayByKeyboard(
    weekday: string,
    session: string,
  ): Promise<void> {
    await this.dayMenu(weekday).focus();
    await this.page.keyboard.press("Enter");
    await expect(this.menuItem("Session")).toBeFocused();
    await this.page.keyboard.press("ArrowRight");
    const item = this.menuItem(session);
    await expect(item).toBeVisible();
    const maxPresses = await this.page.getByRole("menuitem").count();
    for (let press = 0; press < maxPresses; press += 1) {
      if (await item.evaluate((element) => element === document.activeElement))
        break;
      await this.page.keyboard.press("ArrowDown");
    }
    await expect(item).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByRole("menu")).toHaveCount(0);
    await expect(this.dayMenu(weekday)).toBeFocused();
  }

  async chooseDayKind(weekday: string, kind: "Cardio" | "Rest"): Promise<void> {
    await this.dayMenu(weekday).click();
    await this.menuItem(kind).click();
  }

  async expectDayMenuFocused(weekday: string): Promise<void> {
    await expect(this.dayMenu(weekday)).toBeFocused();
  }

  private spokenText(scope: Locator): Promise<string> {
    return scope.evaluate((root) => {
      const parts: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest("[aria-hidden='true']")) continue;
        parts.push(node.textContent ?? "");
      }

      return parts.join(" ").replace(/\s+/g, " ").trim();
    });
  }

  async expectDaySpoken(weekday: string, spoken: string): Promise<void> {
    await expect
      .poll(() => this.spokenText(this.dayCard(weekday)))
      .toBe(`${weekday} ${spoken}`);
  }

  async expectOpenDaySpoken(spoken: RegExp): Promise<void> {
    await expect
      .poll(() => this.spokenText(this.week.getByRole("tabpanel")))
      .toMatch(spoken);
  }

  async expectBlockActions(actions: readonly string[]): Promise<void> {
    await this.page.getByRole("button", { name: "Block actions" }).click();
    await expect(this.page.getByRole("menu").getByRole("menuitem")).toHaveText([
      ...actions,
    ]);
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.getByRole("button", { name: "Block actions" }),
    ).toBeFocused();
  }

  async resetToSplit(): Promise<void> {
    await this.page.getByRole("button", { name: "Block actions" }).click();
    await this.menuItem("Reset to split").click();
  }

  async removeBlockFromHeader(): Promise<void> {
    await this.page.getByRole("button", { name: "Block actions" }).click();
    await this.menuItem("Remove block").click();
  }

  async chooseBlockHeaderType(type: string): Promise<void> {
    await this.chooseOption("Block type", type);
  }

  async chooseSplit(split: string): Promise<void> {
    await this.chooseOption("Split", split);
    await this.confirmUnlessApplied(
      "Rebuild sessions",
      this.select("Split").filter({ hasText: split }),
    );
  }

  async chooseTrainingDaysExpectingConfirmation(days: string): Promise<void> {
    await this.chooseOption("Training days", days);
  }

  async expectTrainingDaysFocused(): Promise<void> {
    await expect(this.select("Training days")).toBeFocused();
  }

  private get calibrationSwitch(): Locator {
    return this.page.getByRole("switch", { name: "Calibration week" });
  }

  async switchCalibrationByKeyboard(): Promise<void> {
    await this.calibrationSwitch.focus();
    await this.page.keyboard.press("Space");
  }

  async expectCalibrationOn(): Promise<void> {
    await expect(this.calibrationSwitch).toBeVisible();
    await expect(this.calibrationSwitch).toBeChecked();
  }

  async expectNoCalibration(): Promise<void> {
    await expect(this.calibrationSwitch).toHaveCount(0);
  }

  async expectCalibrationExplained(): Promise<void> {
    const hint = this.page.getByRole("button", {
      name: "What a calibration week is",
    });
    await hint.focus();
    await this.page.keyboard.press("Enter");
    await expect(
      this.page.getByRole("tooltip").or(this.page.getByRole("dialog")).first(),
    ).toBeVisible();
    await this.page.keyboard.press("Escape");
  }

  async nameSplit(name: string): Promise<void> {
    await this.page
      .getByRole("textbox", { name: "Split name", exact: true })
      .fill(name);
  }

  async expectSplitName(name: string): Promise<void> {
    await expect(
      this.page.getByRole("textbox", { name: "Split name", exact: true }),
    ).toHaveValue(name);
  }

  async expectSelectReads(field: string, value: string): Promise<void> {
    await expect(this.select(field)).toHaveText(value);
  }

  async expectTrainingDayChoices(choices: readonly string[]): Promise<void> {
    await this.select("Training days").click();
    await expect(this.page.getByRole("option")).toHaveText([...choices]);
    await this.page.keyboard.press("Escape");
  }

  async expectEditingLockedBehindChangedElsewhere(): Promise<void> {
    const dialog = this.page.getByRole("alertdialog", {
      name: "This draft changed elsewhere",
    });
    await expect(dialog.getByRole("button")).toHaveText(["Reload"]);
    await expect(dialog.getByRole("button", { name: "Reload" })).toBeFocused();
    await expect(this.select("Level")).toHaveCount(0);
    await this.page.mouse.click(4, 4);
    await expect(dialog).toBeVisible();
    await this.page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Reload" })).toBeFocused();
  }

  async holdSaves(): Promise<() => void> {
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await this.page.route(SAVE_REQUEST, async (route) => {
      await released;
      await route.continue();
    });

    return release;
  }

  async failSavesSlowly(delayMs: number): Promise<void> {
    await this.page.route(SAVE_REQUEST, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({ status: 500, body: "" });
    });
  }

  async expectTryingAgain(): Promise<void> {
    const button = this.page.getByRole("button", { name: "Trying again…" });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toBeFocused();
    await this.expectSaving();
  }

  async expectTryAgainNowFocused(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Try again now" }),
    ).toBeFocused();
  }

  async expectStillFailing(): Promise<void> {
    await this.expectFailedSave();
    await expect(this.page.getByRole("alert")).toHaveCount(1);
  }

  async expectFailedAlertGone(): Promise<void> {
    await expect(this.page.getByRole("alert")).toHaveCount(0);
  }

  async expectBackLinkFocused(fullName: string): Promise<void> {
    await expect(
      this.page.getByRole("link", { name: `Back to ${fullName}` }),
    ).toBeFocused();
  }

  async expectLandmarks(): Promise<void> {
    await expect(
      this.page.getByRole("main", { name: "Program editor" }),
    ).toHaveCount(1);
    await expect(
      this.page.getByRole("navigation", { name: "Editor" }),
    ).toHaveCount(1);
    await expect(
      this.page.getByRole("navigation", { name: "Program sections" }),
    ).toHaveCount(1);
    await expect(
      this.page.getByRole("complementary", { name: "Program outline" }),
    ).toHaveCount(1);
    await expect(this.page.getByRole("banner")).toHaveCount(1);
  }

  async openSectionsDrawerByKeyboard(): Promise<void> {
    const trigger = this.page.getByRole("button", { name: "Program sections" });
    await trigger.focus();
    await this.page.keyboard.press("Enter");
    await expect(
      this.page.getByRole("dialog", { name: "Program outline" }),
    ).toBeVisible();
  }

  async openBlockFromDrawerByKeyboard(
    position: number,
    type: string,
  ): Promise<void> {
    const drawer = this.page.getByRole("dialog", { name: "Program outline" });
    await tabTo(
      this.page,
      drawer.getByRole("button", {
        name: new RegExp(`^${position}\\s?${escapedPattern(type)}`),
      }),
    );
    await this.page.keyboard.press("Enter");
    await expect(drawer).toHaveCount(0);
    await this.expectOnBlock(position, type);
  }

  async closeSectionsDrawerByEscape(): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.getByRole("dialog", { name: "Program outline" }),
    ).toHaveCount(0);
    await expect(
      this.page.getByRole("button", { name: "Program sections" }),
    ).toBeFocused();
  }

  async expectNoRunningAnimations(): Promise<void> {
    const running = await this.page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === "running" &&
            Number(animation.effect?.getComputedTiming().duration ?? 0) > 1,
        )
        .map((animation) => {
          if (animation instanceof CSSTransition) {
            return animation.transitionProperty;
          }
          if (animation instanceof CSSAnimation) return animation.animationName;

          return "script";
        }),
    );

    expect(running).toEqual([]);
  }

  async openSectionsDrawer(): Promise<void> {
    await expect(async () => {
      await this.page.getByRole("button", { name: "Program sections" }).click();
      await expect(
        this.page.getByRole("dialog", { name: "Program outline" }),
      ).toBeVisible({ timeout: HYDRATION_RETRY_TIMEOUT_MS });
    }).toPass();
  }

  async openBlockFromDrawer(position: number, type: string): Promise<void> {
    await this.page
      .getByRole("dialog", { name: "Program outline" })
      .getByRole("button", {
        name: new RegExp(`^${position}\\s?${escapedPattern(type)}`),
      })
      .click();
    await expect(
      this.page.getByRole("dialog", { name: "Program outline" }),
    ).toHaveCount(0);
    await this.expectOnBlock(position, type);
  }

  async chooseDayTab(weekday: string): Promise<void> {
    await this.week
      .getByRole("tablist", { name: "Days" })
      .getByRole("tab", { name: new RegExp(`^${weekday}`) })
      .click();
    await expect(
      this.week.getByRole("tabpanel").getByRole("heading", { name: weekday }),
    ).toBeVisible();
  }

  async expectOnlyDayMenusInTheWeek(): Promise<void> {
    await expect(this.week.getByRole("button")).toHaveCount(7);
    await expect(
      this.week.getByRole("button", { name: /^[A-Z][a-z]+day options$/ }),
    ).toHaveCount(7);
  }
}
