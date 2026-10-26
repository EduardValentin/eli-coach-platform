import { expect, type Locator, type Page } from "@playwright/test";

import {
  checkInsListed,
  checkInTab,
  expectCheckInsInOrder,
  expectEmptyCheckInTab,
  expectJoinEmphasis,
  expectWaitingOnViewer,
  showCheckInTab,
  type CheckInShowing,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";
import type { PickedCheckIn } from "./check-in-picker-dialog";
import { AD_HOC, CheckInRows } from "./check-in-rows";
import {
  CheckInToolbar,
  type AddressParams,
  type CheckInFilter,
  type CountedOption,
  type OptionCounts,
  type SortReading,
} from "./check-in-toolbar";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import { countedNavigationName } from "./navigation-counts";

const CHECK_INS_PATH = "/coach/checkins";
const CHECK_INS_DATA_PATH = new RegExp(`^${CHECK_INS_PATH}\\.data$`);
const APPROVAL_DATA_PATH = /^\/api\/check-ins\/[^/]+\/approval\.data$/;
const REVIEW_URL = /[?&]checkin=/;
const SEARCH_PARAM = "q";
const CHECK_IN_ANCHOR = '[id^="checkin-"]';
const REQUESTED_BY_YOU = "Requested by you";
const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";
const FINDING_A_NEW_TIME = "Finding a new time";

export class CoachCheckInsPage {
  private readonly rows: CheckInRows;
  private readonly toolbar: CheckInToolbar;

  constructor(private readonly page: Page) {
    this.rows = new CheckInRows(page);
    this.toolbar = new CheckInToolbar(page);
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

  private get searchField() {
    return this.page.getByRole("searchbox", {
      name: "Search check-ins",
      exact: true,
    });
  }

  async open(): Promise<void> {
    await this.page.goto(CHECK_INS_PATH);
    await this.expectOpen();
  }

  async visitAddress(params: AddressParams): Promise<void> {
    await this.page.goto(`${CHECK_INS_PATH}?${new URLSearchParams(params)}`);
    await expect(this.heading).toBeVisible();
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

  async expectReviewLandedOn(tab: CheckInTab, showing: string): Promise<void> {
    await expect(this.page).toHaveURL(REVIEW_URL);
    await this.expectTabShown(tab);
    await expect(
      this.checkIn(tab, showing).locator(CHECK_IN_ANCHOR),
    ).toBeFocused();
  }

  async expectCheckInFocused(
    tab: CheckInTab,
    checkInId: string,
  ): Promise<void> {
    await this.expectTabShown(tab);
    await expect(this.page.locator(`#checkin-${checkInId}`)).toBeFocused();
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

  async expectOptionCounts(
    filter: CheckInFilter,
    counts: OptionCounts,
  ): Promise<void> {
    await this.toolbar.expectOptionCounts(filter, counts);
  }

  async chooseKind(label: string): Promise<void> {
    await this.toolbar.chooseFilter("Kind", label);
  }

  async chooseWaiting(label: string): Promise<void> {
    await this.toolbar.chooseFilter("Waiting on", label);
  }

  async chooseKindByKeyboard(option: CountedOption): Promise<void> {
    await this.toolbar.chooseFilterByKeyboard("Kind", option);
  }

  async chooseWaitingByKeyboard(option: CountedOption): Promise<void> {
    await this.toolbar.chooseFilterByKeyboard("Waiting on", option);
  }

  async expectKind(label: string): Promise<void> {
    await this.toolbar.expectFilterReads("Kind", label);
  }

  async search(term: string): Promise<void> {
    await expect(async () => {
      await this.searchField.fill(term);
      await expect(this.page).toHaveURL(
        (url) => (url.searchParams.get(SEARCH_PARAM) ?? "") === term,
        { timeout: HYDRATION_RETRY_TIMEOUT_MS },
      );
    }).toPass();
  }

  async expectSearchReads(term: string): Promise<void> {
    await expect(this.searchField).toHaveValue(term);
  }

  async toggleSort(): Promise<void> {
    await this.toolbar.toggleSort();
  }

  async toggleSortByKeyboard(): Promise<void> {
    await this.toolbar.toggleSortByKeyboard();
  }

  async expectSort(reading: SortReading): Promise<void> {
    await this.toolbar.expectSort(reading);
  }

  async showTabByKeyboard(tab: CheckInTab): Promise<void> {
    await this.toolbar.showTabByKeyboard(tab);
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.toolbar.goToPage(pageNumber);
  }

  async goToPageByKeyboard(pageNumber: number): Promise<void> {
    await this.toolbar.goToPageByKeyboard(pageNumber);
  }

  async expectShowing(text: string): Promise<void> {
    await this.toolbar.expectShowing(text);
  }

  async expectEmpty(tab: CheckInTab, title: string): Promise<void> {
    await expectEmptyCheckInTab(this.page, tab, title);
    await this.toolbar.expectNoClearFilters();
  }

  async expectAddress(params: AddressParams): Promise<void> {
    await this.toolbar.expectAddress(CHECK_INS_PATH, params);
  }

  async expectWaitingCount(count: number): Promise<void> {
    await expectWaitingOnViewer(this.page, count);
  }

  checkIn(tab: CheckInTab, showing: string): Locator {
    return checkInsListed(this.page, tab).filter({ hasText: showing });
  }

  async expectInOrder(
    tab: CheckInTab,
    showing: readonly CheckInShowing[],
  ): Promise<void> {
    await expectCheckInsInOrder(this.page, tab, showing);
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

  private async weekRow(
    tab: CheckInTab,
    showing: string,
    week: PickedCheckIn,
  ): Promise<Locator> {
    return this.rows.listedAt(await this.shownRow(tab, showing), week);
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

  async cancelWeek(
    tab: CheckInTab,
    showing: string,
    week: PickedCheckIn,
  ): Promise<void> {
    await this.rows.choose(await this.weekRow(tab, showing, week), "Cancel");
  }

  async rescheduleWeek(
    tab: CheckInTab,
    showing: string,
    week: PickedCheckIn,
  ): Promise<void> {
    await this.rows.choose(
      await this.weekRow(tab, showing, week),
      "Reschedule",
    );
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
    await this.rows.expectRescheduleBlocked(
      await this.shownRow(tab, showing),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnHover(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnHover(
      await this.shownRow(tab, showing),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnFocus(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnFocus(
      await this.shownRow(tab, showing),
      "moves_exhausted",
    );
  }

  async expectRescheduleReasonOnTap(
    tab: CheckInTab,
    showing: string,
  ): Promise<void> {
    await this.rows.expectRescheduleReasonOnTap(
      await this.shownRow(tab, showing),
      "moves_exhausted",
    );
  }

  async expectNoCancel(tab: CheckInTab, showing: string): Promise<void> {
    await this.rows.expectNoCancel(await this.shownRow(tab, showing));
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

  async expectClashesAt(
    showing: string,
    weeks: readonly PickedCheckIn[],
  ): Promise<void> {
    const listed = await this.shownRow("Requests", showing);

    await expect(listed).toHaveCount(weeks.length);
    for (const week of weeks) {
      await this.rows.expectClash(this.rows.listedAt(listed, week));
    }
  }

  async expectCancelledInPast(
    showing: string,
    shown: PickedCheckIn,
  ): Promise<void> {
    await this.showTab("Past");
    await this.rows.expectCancelled(
      this.rows.listedAt(this.checkIn("Past", showing), shown),
    );
  }

  async expectHeldInPast(showing: string, shown: PickedCheckIn): Promise<void> {
    await this.showTab("Past");
    await this.rows.expectNotCancelled(
      this.rows.listedAt(this.checkIn("Past", showing), shown),
    );
  }

  async expectNotListed(tab: CheckInTab, showing: string): Promise<void> {
    await this.showTab(tab);
    await expect(checkInsListed(this.page, tab).first()).toBeVisible();
    await expect(this.checkIn(tab, showing)).toHaveCount(0);
  }

  async expectEveryWeeklyUpcoming(
    showing: string,
    weeks: PickedCheckIn[],
  ): Promise<void> {
    await this.rows.expectEveryWeekListedOnce(
      {
        tab: "Upcoming",
        listed: await this.shownRow("Upcoming", showing),
        pages: this.toolbar,
      },
      weeks,
    );
  }
}
