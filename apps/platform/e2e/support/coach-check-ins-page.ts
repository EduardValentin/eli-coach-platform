import { expect, type Locator, type Page } from "@playwright/test";

import {
  checkInsListed,
  checkInTab,
  expectJoinEmphasis,
  expectWaitingOnViewer,
  showCheckInTab,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";
import type { PickedCheckIn } from "./check-in-picker-dialog";
import { CheckInRows } from "./check-in-rows";
import { tabTo } from "./keyboard";
import { countedNavigationName } from "./navigation-counts";

const CHECK_INS_PATH = "/coach/checkins";
const CHECK_INS_DATA_PATH = new RegExp(`^${CHECK_INS_PATH}\\.data$`);
const APPROVAL_DATA_PATH = /^\/api\/check-ins\/[^/]+\/approval\.data$/;
const REVIEW_URL = /[?&]checkin=/;
const CHECK_IN_ANCHOR = '[id^="checkin-"]';
const REQUESTED_BY_YOU = "Requested by you";
const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";
const FINDING_A_NEW_TIME = "Finding a new time";
const AD_HOC = "Ad-hoc";

export class CoachCheckInsPage {
  private readonly rows: CheckInRows;

  constructor(private readonly page: Page) {
    this.rows = new CheckInRows(page);
  }

  private joinPathOf(checkInId: string): string {
    return `${CHECK_INS_PATH}/${checkInId}/join`;
  }

  private async responseFinished(path: RegExp): Promise<void> {
    const response = await this.page.waitForResponse((candidate) =>
      path.test(new URL(candidate.url()).pathname),
    );
    await response.finished();
  }

  private get navigation() {
    return this.page.getByRole("navigation", {
      name: "Coach portal navigation",
    });
  }

  private get heading() {
    return this.page.getByRole("heading", { level: 1, name: "Check-ins" });
  }

  async open(): Promise<void> {
    await this.page.goto(CHECK_INS_PATH);
    await this.expectOpen();
  }

  async visitReview(checkInId: string): Promise<void> {
    await this.page.goto(
      `${CHECK_INS_PATH}?${new URLSearchParams({ checkin: checkInId })}`,
    );
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(CHECK_INS_PATH);
    await expect(this.heading).toBeVisible();
  }

  async expectReviewLanded(showing: string): Promise<void> {
    await expect(this.page).toHaveURL(REVIEW_URL);
    await expect(this.heading).toBeVisible();
    await this.expectTabShown("Requests");
    await expect(
      this.checkIn("Requests", showing).locator(CHECK_IN_ANCHOR),
    ).toBeFocused();
  }

  async expectReviewOpenedAsUsual(tab: CheckInTab): Promise<void> {
    await expect(this.page).toHaveURL(REVIEW_URL);
    await expect(this.heading).toBeVisible();
    await this.expectTabShown(tab);
    await expect(this.page.locator(`${CHECK_IN_ANCHOR}:focus`)).toHaveCount(0);
  }

  async expectNavigationCount(count: number): Promise<void> {
    await expect(
      this.navigation.getByRole("link", { name: /^Check-ins/ }),
    ).toHaveAccessibleName(countedNavigationName("Check-ins", count));
  }

  async expectNavigationLinks(names: readonly string[]): Promise<void> {
    await expect(this.navigation.getByRole("link")).toHaveText([...names]);
  }

  async openFromNavigation(): Promise<void> {
    await this.navigation.getByRole("link", { name: "Check-ins" }).click();
    await this.expectOpen();
  }

  async expectJoin(showing: string, emphasis: JoinEmphasis): Promise<void> {
    await this.showTab("Upcoming");
    await expectJoinEmphasis(this.checkIn("Upcoming", showing), emphasis);
  }

  async declineAnsweredElsewhere(clientName: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", clientName)
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(this.page.getByText(NO_LONGER_WAITING)).toBeVisible();
  }

  async showTab(tab: CheckInTab): Promise<void> {
    await showCheckInTab(this.page, tab);
  }

  async expectTabShown(tab: CheckInTab): Promise<void> {
    await expect(checkInTab(this.page, tab)).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  async expectWaitingCount(count: number): Promise<void> {
    await expectWaitingOnViewer(this.page, count);
  }

  checkIn(tab: CheckInTab, showing: string): Locator {
    return checkInsListed(this.page, tab).filter({ hasText: showing });
  }

  async approve(clientName: string): Promise<void> {
    await this.showTab("Requests");
    const approvalSettled = this.responseFinished(APPROVAL_DATA_PATH);
    const revalidationSettled = this.responseFinished(CHECK_INS_DATA_PATH);
    await this.checkIn("Requests", clientName)
      .getByRole("button", { name: "Approve" })
      .click();
    await expect(
      this.page.getByText(`Approved check-in with ${clientName}`),
    ).toBeVisible();
    await Promise.all([approvalSettled, revalidationSettled]);
  }

  async decline(clientName: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", clientName)
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(this.page.getByText("Check-in declined")).toBeVisible();
  }

  async expectRequestedByYou(note: string): Promise<void> {
    const row = this.checkIn("Requests", note);

    await this.showTab("Requests");
    await expect(row).toContainText("Requested by you");
    await expect(
      row.getByRole("button", { name: "Cancel request" }),
    ).toBeVisible();
    await expect(row.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Decline" })).toHaveCount(0);
  }

  async cancelRequest(note: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", note)
      .getByRole("button", { name: "Cancel request" })
      .click();
    await expect(this.page.getByText("Request cancelled")).toBeVisible();
  }

  async cancelRequestByKeyboard(note: string): Promise<void> {
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

  async expectWaitingOnYouBeforeYourOwn(
    waitingNote: string,
    ownNote: string,
  ): Promise<void> {
    await this.showTab("Requests");
    await expect(this.checkIn("Requests", ownNote)).toBeVisible();
    await expect(this.checkIn("Requests", waitingNote)).toBeVisible();
    const listed = await checkInsListed(this.page, "Requests").allInnerTexts();
    const isOwn = listed.map((text) => text.includes(REQUESTED_BY_YOU));

    expect(isOwn[listed.findIndex((text) => text.includes(waitingNote))]).toBe(
      false,
    );
    expect(isOwn.lastIndexOf(false)).toBeLessThan(isOwn.indexOf(true));
  }

  private async shownRow(tab: CheckInTab, showing: string): Promise<Locator> {
    await this.showTab(tab);

    return this.checkIn(tab, showing);
  }

  async reschedule(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.choose(await this.shownRow(tab, showing), "Reschedule");
  }

  async rescheduleByKeyboard(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.chooseByKeyboard(
      await this.shownRow(tab, showing),
      "Reschedule",
    );
  }

  async cancelByKeyboard(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.chooseByKeyboard(
      await this.shownRow(tab, showing),
      "Cancel",
    );
  }

  async expectNoRowMenu(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.expectNoMenu(await this.shownRow(tab, showing));
  }

  async cancel(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.choose(await this.shownRow(tab, showing), "Cancel");
  }

  async expectCancelledToast(clientName: string): Promise<void> {
    await expect(
      this.page.getByText(`Cancelled check-in with ${clientName}`),
    ).toBeVisible();
  }

  async expectRowMenuFocused(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.expectMenuFocused(this.checkIn(tab, showing));
  }

  async expectRescheduleBlocked(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleBlocked(await this.shownRow(tab, showing));
  }

  async expectRescheduleReasonOnHover(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnHover(
      await this.shownRow(tab, showing),
    );
  }

  async expectRescheduleReasonOnFocus(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnFocus(
      await this.shownRow(tab, showing),
    );
  }

  async expectRescheduleReasonOnTap(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnTap(
      await this.shownRow(tab, showing),
    );
  }

  async expectNoActions(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.expectNoActions(await this.shownRow(tab, showing));
  }

  async expectNewTimeFromClient(
    note: string,
    clientFirstName: string,
  ): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await expect(row).toContainText(
      `Ad-hoc · New time from ${clientFirstName}`,
    );
    await expect(row).toContainText(`${clientFirstName}: "${note}"`);
    await expect(row.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Decline" })).toBeVisible();
  }

  async expectOwnNewTime(note: string): Promise<void> {
    const row = await this.shownRow("Requests", note);

    await expect(row).toContainText("Ad-hoc · New time from you");
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

  async accept(clientName: string): Promise<void> {
    const row = await this.shownRow("Requests", clientName);
    const approvalSettled = this.responseFinished(APPROVAL_DATA_PATH);
    const revalidationSettled = this.responseFinished(CHECK_INS_DATA_PATH);

    await row.getByRole("button", { name: "Accept" }).click();
    await expect(
      this.page.getByText(`Approved check-in with ${clientName}`),
    ).toBeVisible();
    await Promise.all([approvalSettled, revalidationSettled]);
  }

  async acceptNoLongerWaiting(showing: string): Promise<void> {
    const row = await this.shownRow("Requests", showing);

    await row.getByRole("button", { name: "Accept" }).click();
    await expect(this.page.getByText(NO_LONGER_WAITING)).toBeVisible();
  }

  async joinFromRow(clientName: string): Promise<void> {
    await this.showTab("Upcoming");
    await this.checkIn("Upcoming", clientName)
      .getByRole("link", { name: "Join Meet" })
      .click();
  }

  async openJoinLink(checkInId: string): Promise<void> {
    await this.page.goto(this.joinPathOf(checkInId));
  }

  async expectMeetingLinkNotSet(): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        level: 1,
        name: "Your meeting link isn't set yet",
      }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Go to Settings" }),
    ).toBeVisible();
  }

  async expectClashFirst(showing: string): Promise<void> {
    const first = checkInsListed(this.page, "Requests").first();

    await this.showTab("Requests");
    await expect(first).toContainText(showing);
    await expect(first).toContainText(FINDING_A_NEW_TIME);
    await this.rows.expectClash(first);
  }

  async expectOneWeeklyUpcoming(showing: string): Promise<void> {
    const listed = await this.shownRow("Upcoming", showing);

    await expect(listed).toHaveCount(1);
    await expect(listed).not.toContainText(AD_HOC);
  }
}
