import {
  expect,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

import {
  checkInsListed,
  checkInTab,
  expectCheckInsInOrder,
  expectEmptyCheckInTab,
  expectJoinEmphasis,
  expectWaitingOnViewer,
  showCheckInTab,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";
import type { PickedCheckIn } from "./check-in-picker-dialog";
import { CheckInRows } from "./check-in-rows";
import { DisabledAction } from "./disabled-action";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

const CHECK_INS_PATH = "/client/checkins";
const CHECK_INS_DATA_PATH = new RegExp(`^${CHECK_INS_PATH}\\.data$`);
const APPROVAL_DATA_PATH = /^\/api\/check-ins\/[^/]+\/approval\.data$/;
const WAITING_REASON =
  "You can send another request once this one is answered.";
const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";
const COACH = "your coach";
const COACH_FINDING_A_NEW_TIME = "Your coach is finding a new time";
const AD_HOC = "Ad-hoc";
const REVIEW_URL = /[?&]checkin=/;
const CHECK_IN_ANCHOR = '[id^="checkin-"]';

export class ClientCheckInsPage {
  private readonly requestAction: DisabledAction;
  private readonly rows: CheckInRows;

  constructor(private readonly page: Page) {
    this.requestAction = new DisabledAction(page, {
      button: this.requestButton,
      opens: this.requestDialog,
      reason: WAITING_REASON,
    });
    this.rows = new CheckInRows(page);
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

  async expectReviewLandedOn(tab: CheckInTab, note: string): Promise<void> {
    await expect(this.page).toHaveURL(REVIEW_URL);
    await expect(checkInTab(this.page, tab)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      this.checkIn(tab, note).locator(CHECK_IN_ANCHOR),
    ).toBeFocused();
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

  async declineNoLongerWaiting(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(this.page.getByText(NO_LONGER_WAITING)).toBeVisible();
  }

  async approveByKeyboard(note: string): Promise<void> {
    await this.showTab("Requests");
    await tabTo(
      this.page,
      this.checkIn("Requests", note).getByRole("button", { name: "Approve" }),
    );
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByText("Check-in approved")).toBeVisible();
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

  private async shownRow(tab: CheckInTab, note: string): Promise<Locator> {
    await this.showTab(tab);

    return this.checkIn(tab, note);
  }

  async reschedule(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.choose(await this.shownRow(tab, note), "Reschedule");
  }

  async rescheduleByKeyboard(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.chooseByKeyboard(
      await this.shownRow(tab, note),
      "Reschedule",
    );
  }

  async cancelByKeyboard(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.chooseByKeyboard(await this.shownRow(tab, note), "Cancel");
  }

  async expectNoRowMenu(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.expectNoMenu(await this.shownRow(tab, note));
  }

  async cancel(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.choose(await this.shownRow(tab, note), "Cancel");
  }

  async expectCancelledToast(): Promise<void> {
    await expect(this.page.getByText("Check-in cancelled")).toBeVisible();
  }

  async expectRowMenuFocused(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.expectMenuFocused(this.checkIn(tab, note));
  }

  async expectRescheduleBlocked(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.expectRescheduleBlocked(
      await this.shownRow(tab, note),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnHover(
    tab: CheckInTab,
    note: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnHover(
      await this.shownRow(tab, note),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnFocus(
    tab: CheckInTab,
    note: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnFocus(
      await this.shownRow(tab, note),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnTap(
    tab: CheckInTab,
    note: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnTap(
      await this.shownRow(tab, note),
      "moves_exhausted",
    );
  }

  async expectNoActions(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.expectNoActions(await this.shownRow(tab, note));
  }

  async expectNewTimeFromCoach(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await expect(row).toContainText(`Ad-hoc · New time from ${COACH}`);
    await expect(row).toContainText(`Your coach: "${note}"`);
    await expect(row.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Decline" })).toBeVisible();
  }

  async expectOwnNewTime(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await expect(row).toContainText("Ad-hoc · New time from you");
    await expect(row).toContainText(`You: "${note}"`);
    await this.rows.expectNoActions(row);
  }

  async expectOwnWeeklyNewTime(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await expect(row).toContainText("New time from you");
    await expect(row).not.toContainText(AD_HOC);
    await expect(row).toContainText(`You: "${note}"`);
    await this.rows.expectNoActions(row);
  }

  async expectEarlierTimeStruck(
    note: string,
    earlier: PickedCheckIn,
  ): Promise<void> {
    await this.rows.expectEarlierTimeStruck(
      await this.shownRow("Requests", note),
      earlier,
    );
  }

  async expectUpcomingAt(note: string, shown: PickedCheckIn): Promise<void> {
    await this.rows.expectShownAt(await this.shownRow("Upcoming", note), shown);
  }

  async expectRescheduledFrom(
    note: string,
    earlier: PickedCheckIn,
  ): Promise<void> {
    await this.rows.expectRescheduledFrom(
      await this.shownRow("Upcoming", note),
      earlier,
    );
  }

  async accept(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);
    const approvalSettled = this.responseFinished(APPROVAL_DATA_PATH);
    const revalidationSettled = this.responseFinished(CHECK_INS_DATA_PATH);

    await row.getByRole("button", { name: "Accept" }).click();
    await expect(this.page.getByText("Check-in approved")).toBeVisible();
    await Promise.all([approvalSettled, revalidationSettled]);
  }

  async acceptByKeyboard(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);
    const approvalSettled = this.responseFinished(APPROVAL_DATA_PATH);
    const revalidationSettled = this.responseFinished(CHECK_INS_DATA_PATH);

    await tabTo(this.page, row.getByRole("button", { name: "Accept" }));
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByText("Check-in approved")).toBeVisible();
    await Promise.all([approvalSettled, revalidationSettled]);
  }

  async acceptNoLongerWaiting(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await row.getByRole("button", { name: "Accept" }).click();
    await expect(this.page.getByText(NO_LONGER_WAITING)).toBeVisible();
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

  async expectCoachFindingTimeFirst(): Promise<void> {
    const first = checkInsListed(this.page, "Upcoming").first();

    await this.showTab("Upcoming");
    await expect(first).toContainText(COACH_FINDING_A_NEW_TIME);
    await this.rows.expectClash(first);
  }

  async expectEveryWeeklyUpcoming(
    weeks: readonly PickedCheckIn[],
  ): Promise<void> {
    const listed = checkInsListed(this.page, "Upcoming");

    await this.showTab("Upcoming");
    await expect(listed).toHaveCount(weeks.length);
    await expect(listed.filter({ hasText: AD_HOC })).toHaveCount(0);
    for (const week of weeks) {
      await expect(this.rows.listedAt(listed, week)).toHaveCount(1);
    }
  }

  private async upcomingWeekRow(week: PickedCheckIn): Promise<Locator> {
    await this.showTab("Upcoming");

    return this.rows.listedAt(checkInsListed(this.page, "Upcoming"), week);
  }

  async expectNextWeekMovable(week: PickedCheckIn): Promise<void> {
    const row = await this.upcomingWeekRow(week);

    await this.rows.expectRescheduleAllowed(row);
    await this.rows.expectNoCancel(row);
  }

  async expectLaterWeekHeldBack(week: PickedCheckIn): Promise<void> {
    const row = await this.upcomingWeekRow(week);

    await this.rows.expectRescheduleBlocked(row, "later_week");
    await this.rows.expectNoCancel(row);
  }

  async expectLaterWeekReasonOnHover(week: PickedCheckIn): Promise<void> {
    await this.rows.expectRescheduleReasonOnHover(
      await this.upcomingWeekRow(week),
      "later_week",
    );
  }

  async expectLaterWeekReasonOnFocus(week: PickedCheckIn): Promise<void> {
    await this.rows.expectRescheduleReasonOnFocus(
      await this.upcomingWeekRow(week),
      "later_week",
    );
  }

  async expectCancelledInPast(shown: PickedCheckIn): Promise<void> {
    await this.showTab("Past");
    await this.rows.expectCancelled(
      this.rows.listedAt(checkInsListed(this.page, "Past"), shown),
    );
  }

  async expectNoCancel(tab: CheckInTab, note: string): Promise<void> {
    await this.rows.expectNoCancel(await this.shownRow(tab, note));
  }
}
