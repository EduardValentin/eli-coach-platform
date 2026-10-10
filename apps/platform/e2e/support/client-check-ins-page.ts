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
  expectWaitingOnViewer,
  showCheckInTab,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";
import { DisabledAction } from "./disabled-action";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const CHECK_INS_PATH = "/client/checkins";
const CHECK_INS_DATA_PATH = new RegExp(`^${CHECK_INS_PATH}\\.data$`);
const APPROVAL_DATA_PATH = /^\/api\/check-ins\/[^/]+\/approval\.data$/;
const WAITING_REASON =
  "You can send another request once this one is answered.";
const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";

export class ClientCheckInsPage {
  private readonly requestAction: DisabledAction;

  constructor(private readonly page: Page) {
    this.requestAction = new DisabledAction(page, {
      button: this.requestButton,
      opens: this.requestDialog,
      reason: WAITING_REASON,
    });
  }

  private get requestButton() {
    return this.page.getByRole("button", {
      name: "Request check-in",
      exact: true,
    });
  }

  private get requestDialog() {
    return this.page.getByRole("dialog", { name: "Request a check-in" });
  }

  private async responseFinished(path: RegExp): Promise<void> {
    const response = await this.page.waitForResponse((candidate) =>
      path.test(new URL(candidate.url()).pathname),
    );
    await response.finished();
  }

  private joinPathOf(checkInId: string): string {
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
    await this.requestAction.expectBlocked();
  }

  async expectBlockedReasonOnHover(): Promise<void> {
    await this.requestAction.expectReasonOnHover();
  }

  async expectBlockedReasonOnFocus(): Promise<void> {
    await this.requestAction.expectReasonOnFocus();
  }

  async expectBlockedReasonOnTap(): Promise<void> {
    await this.requestAction.expectReasonOnTap();
  }

  async expectRequestAllowed(): Promise<void> {
    await this.requestAction.expectAllowed();
  }

  async expectWaitingCount(count: number): Promise<void> {
    await expectWaitingOnViewer(this.page, count);
  }

  async expectRequestedByCoach(note: string): Promise<void> {
    const first = checkInsListed(this.page, "Requests").first();

    await this.showTab("Requests");
    await expect(first).toContainText(note);
    await expect(first).toContainText("Requested by your coach");
  }

  async expectAnswerOffered(note: string): Promise<void> {
    const row = this.checkIn("Requests", note);

    await this.showTab("Requests");
    await expect(row.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Decline" })).toBeVisible();
    await expect(
      row.getByRole("button", { name: "Cancel request" }),
    ).toHaveCount(0);
  }

  async approve(note: string): Promise<void> {
    await this.showTab("Requests");
    const approvalSettled = this.responseFinished(APPROVAL_DATA_PATH);
    const revalidationSettled = this.responseFinished(CHECK_INS_DATA_PATH);
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Approve" })
      .click();
    await expect(this.page.getByText("Check-in approved")).toBeVisible();
    await Promise.all([approvalSettled, revalidationSettled]);
  }

  async decline(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(this.page.getByText("Check-in declined")).toBeVisible();
  }

  async approveNoLongerWaiting(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Approve" })
      .click();
    await expect(this.page.getByText(NO_LONGER_WAITING)).toBeVisible();
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
    return this.page.goto(this.joinPathOf(checkInId));
  }

  async expectNotFound(response: Response | null): Promise<void> {
    expect(response?.status()).toBe(404);
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
  }

  async expectJoinNotReady(checkInId: string): Promise<void> {
    await expect(this.page).toHaveURL(this.joinPathOf(checkInId));
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
