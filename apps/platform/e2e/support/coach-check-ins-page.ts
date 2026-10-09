import { expect, type Locator, type Page } from "@playwright/test";

import {
  checkInsListed,
  checkInTab,
  expectJoinEmphasis,
  showCheckInTab,
  type CheckInTab,
  type JoinEmphasis,
} from "./check-in-tabs";

const CHECK_INS_PATH = "/coach/checkins";
const NO_LONGER_WAITING = "This request is no longer waiting for an answer.";

export class CoachCheckInsPage {
  constructor(private readonly page: Page) {}

  private static joinPathOf(checkInId: string): string {
    return `${CHECK_INS_PATH}/${checkInId}/join`;
  }

  private get navigation() {
    return this.page.getByRole("navigation", {
      name: "Coach portal navigation",
    });
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
    await expect(checkInTab(this.page, "Requests")).toHaveAccessibleName(
      new RegExp(`^Requests\\b.*\\b${count}\\b`),
    );
  }

  checkIn(tab: CheckInTab, showing: string): Locator {
    return checkInsListed(this.page, tab).filter({ hasText: showing });
  }

  async approve(clientName: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", clientName)
      .getByRole("button", { name: "Approve" })
      .click();
    await expect(
      this.page.getByText(`Approved check-in with ${clientName}`),
    ).toBeVisible();
  }

  async decline(clientName: string): Promise<void> {
    await this.showTab("Requests");
    await this.checkIn("Requests", clientName)
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(this.page.getByText("Check-in declined")).toBeVisible();
  }

  async joinFromRow(clientName: string): Promise<void> {
    await this.showTab("Upcoming");
    await this.checkIn("Upcoming", clientName)
      .getByRole("link", { name: "Join Meet" })
      .click();
  }

  async openJoinLink(checkInId: string): Promise<void> {
    await this.page.goto(CoachCheckInsPage.joinPathOf(checkInId));
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
}
