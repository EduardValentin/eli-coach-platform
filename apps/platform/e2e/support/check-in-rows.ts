import { expect, type Locator, type Page } from "@playwright/test";

import {
  clockTimeOf,
  shortDayOf,
  shortMomentOf,
  spacedPattern,
} from "./check-in-moments";
import type { PickedCheckIn } from "./check-in-picker-dialog";
import type { ConfirmationLabels } from "./confirmation-dialog";
import { DisabledAction } from "./disabled-action";
import { isFocused, tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

type CheckInMenuItem = "Reschedule" | "Cancel";

export const CANCEL_CHECK_IN_LABELS: ConfirmationLabels = {
  title: "Cancel this check-in?",
  confirm: "Cancel check-in",
  dismiss: "Keep",
};

const MENU_TRIGGER = /^More actions for the check-in on /;
const MOVES_EXHAUSTED_REASON = "This check-in has already been moved twice.";
const PROPOSE_DIALOG_TITLE = "Propose a new time";
const MAX_ARROW_STOPS = 6;

export class CheckInRows {
  constructor(private readonly page: Page) {}

  private get menu() {
    return this.page.getByRole("menu");
  }

  private get proposeDialog() {
    return this.page.getByRole("dialog", { name: PROPOSE_DIALOG_TITLE });
  }

  private triggerOf(row: Locator): Locator {
    return row.getByRole("button", { name: MENU_TRIGGER });
  }

  private itemNamed(item: CheckInMenuItem): Locator {
    return this.menu.getByRole("menuitem", { name: item, exact: true });
  }

  private rescheduleActionOf(row: Locator): DisabledAction {
    return new DisabledAction(this.page, {
      button: this.itemNamed("Reschedule"),
      opens: this.proposeDialog,
      reason: MOVES_EXHAUSTED_REASON,
      focusByKeyboard: () => this.focusItemByKeyboard(row, "Reschedule"),
    });
  }

  private async openMenu(row: Locator): Promise<void> {
    await expect(async () => {
      if (!(await this.menu.isVisible())) {
        await this.triggerOf(row).click();
      }
      await expect(this.menu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async openMenuByKeyboard(row: Locator): Promise<void> {
    await expect(async () => {
      if (!(await this.menu.isVisible())) {
        await tabTo(this.page, this.triggerOf(row));
        await this.page.keyboard.press("Enter");
      }
      await expect(this.menu).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  private async focusItemByKeyboard(
    row: Locator,
    item: CheckInMenuItem,
  ): Promise<void> {
    await this.openMenuByKeyboard(row);
    const target = this.itemNamed(item);

    for (let stop = 0; stop < MAX_ARROW_STOPS; stop += 1) {
      if (await isFocused(target)) return;
      await this.page.keyboard.press("ArrowDown");
    }

    throw new Error(`The keyboard never reached ${item} in the row menu.`);
  }

  private async closeMenu(row: Locator): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(this.menu).toBeHidden();
    await expect(this.triggerOf(row)).toBeFocused();
  }

  async choose(row: Locator, item: CheckInMenuItem): Promise<void> {
    await this.openMenu(row);
    await this.itemNamed(item).click();
  }

  async chooseByKeyboard(row: Locator, item: CheckInMenuItem): Promise<void> {
    await this.focusItemByKeyboard(row, item);
    await this.page.keyboard.press("Enter");
  }

  async expectRescheduleBlocked(row: Locator): Promise<void> {
    await this.openMenu(row);
    await this.rescheduleActionOf(row).expectBlocked();
    await expect(this.itemNamed("Cancel")).toBeEnabled();
    await this.closeMenu(row);
  }

  async expectRescheduleReasonOnHover(row: Locator): Promise<void> {
    await this.openMenu(row);
    await this.rescheduleActionOf(row).expectReasonOnHover();
    await this.closeMenu(row);
  }

  async expectRescheduleReasonOnFocus(row: Locator): Promise<void> {
    await this.rescheduleActionOf(row).expectReasonOnFocus();
    await this.closeMenu(row);
  }

  async expectRescheduleReasonOnTap(row: Locator): Promise<void> {
    await this.openMenu(row);
    await this.rescheduleActionOf(row).expectReasonOnTap();
    await this.closeMenu(row);
  }

  async expectMenuFocused(row: Locator): Promise<void> {
    await expect(this.triggerOf(row)).toBeFocused();
  }

  async expectNoActions(row: Locator): Promise<void> {
    await expect(row).toBeVisible();
    await expect(row.getByRole("button")).toHaveCount(0);
  }

  async expectShownAt(row: Locator, shown: PickedCheckIn): Promise<void> {
    const { startsAt, timeZone } = shown;

    await expect(row).toContainText(
      new RegExp(spacedPattern(shortDayOf(startsAt, timeZone))),
    );
    await expect(row).toContainText(
      new RegExp(spacedPattern(clockTimeOf(startsAt, timeZone))),
    );
  }

  async expectEarlierTimeStruck(
    row: Locator,
    earlier: PickedCheckIn,
  ): Promise<void> {
    await expect(row.locator("s")).toHaveText(
      new RegExp(
        `^${spacedPattern(shortMomentOf(earlier.startsAt, earlier.timeZone))}$`,
      ),
    );
  }

  async expectRescheduledFrom(
    row: Locator,
    earlier: PickedCheckIn,
  ): Promise<void> {
    await expect(
      row.getByRole("button", {
        name: new RegExp(
          `^Rescheduled from ${spacedPattern(shortMomentOf(earlier.startsAt, earlier.timeZone))}$`,
        ),
      }),
    ).toBeVisible();
    await expect(row.locator("s")).toHaveCount(0);
  }
}
