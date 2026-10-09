import {
  expect,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

import {
  checkInsListed,
  showCheckInTab,
  type CheckInTab,
} from "./check-in-tabs";
import { tabTo } from "./keyboard";
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

  private static joinPathOf(checkInId: string): string {
    return `${CHECK_INS_PATH}/${checkInId}/join`;
  }

  async open(): Promise<void> {
    await this.page.goto(CHECK_INS_PATH);
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
    await expect(this.requestButton).toBeDisabled();
    await expect(this.requestButton).toHaveAccessibleDescription(
      WAITING_REASON,
    );
  }

  async expectRequestAllowed(): Promise<void> {
    await expect(this.requestButton).toBeEnabled();
    await expect(this.page.getByText(WAITING_REASON)).toBeHidden();
  }

  async withdraw(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Cancel request" })
      .click();
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
