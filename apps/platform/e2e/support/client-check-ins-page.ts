import {
  expect,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

import {
  checkInsListed,
  expectCheckInsInOrder,
  expectEmptyCheckInTab,
  expectJoinEmphasis,
  showCheckInTab,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";
import { isFocused, tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const CHECK_INS_PATH = "/client/checkins";
const WAITING_REASON =
  "You can send another request once this one is answered.";

export class ClientCheckInsPage {
  constructor(private readonly page: Page) {}

  private get requestButton() {
    return this.page.getByRole("button", {
      name: "Request check-in",
      exact: true,
    });
  }

  private get requestDialog() {
    return this.page.getByRole("dialog", { name: "Request a check-in" });
  }

  private get waitingReason() {
    return this.page.getByText(WAITING_REASON, { exact: true });
  }

  private static joinPathOf(checkInId: string): string {
    return `${CHECK_INS_PATH}/${checkInId}/join`;
  }

  async visit(): Promise<void> {
    await this.page.goto(CHECK_INS_PATH);
  }

  async open(): Promise<void> {
    await this.visit();
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(CHECK_INS_PATH);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Check-ins" }),
    ).toBeVisible();
  }

  async showTab(tab: CheckInTab): Promise<void> {
    await showCheckInTab(this.page, tab);
  }

  checkIn(tab: CheckInTab, note: string): Locator {
    return checkInsListed(this.page, tab).filter({ hasText: note });
  }

  async expectInOrder(
    tab: CheckInTab,
    notes: readonly string[],
  ): Promise<void> {
    await expectCheckInsInOrder(this.page, tab, notes);
  }

  async expectEmpty(tab: CheckInTab, title: string): Promise<void> {
    await expectEmptyCheckInTab(this.page, tab, title);
  }

  async expectJoin(note: string, emphasis: JoinEmphasis): Promise<void> {
    await this.showTab("Upcoming");
    await expectJoinEmphasis(this.checkIn("Upcoming", note), emphasis);
  }

  async openRequestDialog(): Promise<void> {
    await expect(async () => {
      await this.requestButton.click();
      await expect(this.requestDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async openRequestDialogWithKeyboard(): Promise<void> {
    await expect(async () => {
      await tabTo(this.page, this.requestButton);
      await this.page.keyboard.press("Enter");
      await expect(this.requestDialog).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
  }

  async expectRequestButtonFocused(): Promise<void> {
    await expect(this.requestButton).toBeFocused();
  }

  async expectFloatingRequestButton(): Promise<void> {
    await expect(this.requestButton).toBeVisible();
    await expect(this.requestButton).toHaveCSS("position", "fixed");
  }

  async expectRequestBlocked(): Promise<void> {
    await expect(this.requestButton).toHaveAttribute("aria-disabled", "true");
    await expect(this.requestButton).toBeDisabled();
  }

  async expectBlockedReasonOnHover(): Promise<void> {
    await expect(async () => {
      await this.requestButton.hover();
      await expect(this.waitingReason).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.expectWaitingReasonDescribesRequest();
    await this.requestButton.click({ force: true });
    await expect(this.requestDialog).toBeHidden();
    await this.page.mouse.move(0, 0);
    await expect(this.waitingReason).toBeHidden();
  }

  async expectBlockedReasonOnFocus(): Promise<void> {
    if (await isFocused(this.requestButton)) {
      await this.page.keyboard.press("Shift+Tab");
    }
    await tabTo(this.page, this.requestButton);
    await expect(this.waitingReason).toBeVisible();
    await this.expectWaitingReasonDescribesRequest();
    await this.page.keyboard.press("Enter");
    await expect(this.requestDialog).toBeHidden();
    await this.page.keyboard.press("Escape");
    await expect(this.waitingReason).toBeHidden();
    await expect(this.requestButton).toBeFocused();
  }

  async expectBlockedReasonOnTap(): Promise<void> {
    await expect(async () => {
      await this.requestButton.tap({ force: true });
      await expect(this.waitingReason).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.expectWaitingReasonDescribesRequest();
    await expect(this.requestDialog).toBeHidden();
    await this.requestButton.tap({ force: true });
    await expect(this.waitingReason).toBeHidden();
    await expect(this.requestDialog).toBeHidden();
  }

  private async expectWaitingReasonDescribesRequest(): Promise<void> {
    await expect(this.requestButton).toHaveAccessibleDescription(
      WAITING_REASON,
    );
  }

  async expectRequestAllowed(): Promise<void> {
    await expect(this.requestButton).toBeEnabled();
    await expect(this.requestButton).not.toHaveAttribute("aria-disabled");
    await expect(this.waitingReason).toBeHidden();
  }

  async withdraw(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Cancel request" })
      .click();
    await expect(this.page.getByText("Request cancelled")).toBeVisible();
  }

  async withdrawByKeyboard(note: string): Promise<void> {
    await this.showTab("Requests");
    await tabTo(
      this.page,
      this.checkIn("Requests", note).getByRole("button", {
        name: "Cancel request",
      }),
    );
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByText("Request cancelled")).toBeVisible();
  }

  async joinFromRow(note: string): Promise<void> {
    await this.showTab("Upcoming");
    await this.checkIn("Upcoming", note)
      .getByRole("link", { name: "Join Meet" })
      .click();
  }

  async openJoinLink(checkInId: string): Promise<Response | null> {
    return this.page.goto(ClientCheckInsPage.joinPathOf(checkInId));
  }

  async expectNotFound(response: Response | null): Promise<void> {
    expect(response?.status()).toBe(404);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
  }

  async expectJoinNotReady(checkInId: string): Promise<void> {
    await expect(this.page).toHaveURL(ClientCheckInsPage.joinPathOf(checkInId));
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: "Your check-in link isn't ready yet",
      }),
    ).toBeVisible();
  }

  async returnFromNotReadyJoin(): Promise<void> {
    await this.page.getByRole("link", { name: "Back to check-ins" }).click();
    await this.expectOpen();
  }
}
