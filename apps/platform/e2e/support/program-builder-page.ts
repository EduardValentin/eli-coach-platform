import { expect, type Locator, type Page } from "@playwright/test";

import { escapedPattern, HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type PlanRow = { type: string; weeks: string };

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
