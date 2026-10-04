import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import { expect, type Page } from "@playwright/test";

import { ConfirmationDialog } from "./confirmation-dialog";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";
import {
  REFUSED_PHOTO_TOAST,
  refusedPhotoToastOf,
} from "./progress-photo-copy";

type CarriedDashboardState = {
  usr?: { refusedPhotoViews?: unknown[] } | null;
} | null;

const ONBOARDING_REGION_LABEL = "Your onboarding";
const PROGRAM_REGION_LABEL = "Your program";
const NEEDS_DETAILS_LABEL = "Your coach needs a few more details";
const ANSWER_PATH = "/client/onboarding?answer=1";
const DASHBOARD_PATH = "/client";
const PROFILE_PATH = "/client/profile";
const NUDGE_LINES = [
  "Your weekly weigh-in is due",
  "Time for your measurements and photos",
] as const;
const START_SOONER_NOTE =
  "Want Eli to start sooner? You can give up your 14-day right of withdrawal and let her begin now.";
const WORK_START_LINE_PATTERN = /starts working on your program on/;
const PAYMENT_ACTION_PATTERN = /payment method|^Change$|^Manage$/i;
const PAYMENT_PROBLEM_PATTERN = /payment didn't go through/;
const START_NOW_LABELS = {
  title: "Let Eli start now?",
  confirm: "Yes, start now",
  dismiss: "Keep my 14 days",
};

export type NudgeLine = (typeof NUDGE_LINES)[number];

export class ClientDashboard {
  constructor(private readonly page: Page) {}

  private get onboardingStatus() {
    return this.page.getByRole("region", { name: ONBOARDING_REGION_LABEL });
  }

  private get programStatus() {
    return this.page.getByRole("region", { name: PROGRAM_REGION_LABEL });
  }

  private nudge(line: NudgeLine) {
    return this.page.getByRole("link", { name: line });
  }

  private get startNowButton() {
    return this.page.getByRole("button", {
      name: "Let Eli start now",
      exact: true,
    });
  }

  private get startSoonerNote() {
    return this.page.getByText(START_SOONER_NOTE, { exact: true });
  }

  private get answerNowLink() {
    return this.onboardingStatus.getByRole("link", { name: "Answer now" });
  }

  async open(): Promise<void> {
    await this.page.goto(DASHBOARD_PATH);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${DASHBOARD_PATH}$`));
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async expectNoRefusedPhotosCarried(): Promise<void> {
    await expect
      .poll(() => this.page.evaluate(refusedPhotoViewsCarried))
      .toEqual([]);
  }

  async expectOnlyNudge(line: NudgeLine): Promise<void> {
    await expect(this.nudge(line)).toHaveAttribute("href", PROFILE_PATH);

    for (const other of NUDGE_LINES.filter((candidate) => candidate !== line)) {
      await expect(this.nudge(other)).toHaveCount(0);
    }
  }

  async expectNoNudge(): Promise<void> {
    for (const line of NUDGE_LINES) {
      await expect(this.nudge(line)).toHaveCount(0);
    }
  }

  async followNudge(line: NudgeLine): Promise<void> {
    await this.nudge(line).click();
  }

  async expectStatusCard(label: string, line: string): Promise<void> {
    await expect(
      this.onboardingStatus.getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(this.onboardingStatus.getByText(line)).toBeVisible();
  }

  async expectNoWorkStartLine(): Promise<void> {
    await expect(this.onboardingStatus).toBeVisible();
    await expect(
      this.onboardingStatus.getByText(WORK_START_LINE_PATTERN),
    ).toHaveCount(0);
  }

  async expectProgramCard(label: string, line: string): Promise<void> {
    await expect(
      this.programStatus.getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(this.programStatus.getByText(line)).toBeVisible();
  }

  async expectRequestNote(note: string): Promise<void> {
    await this.expectStatusCard(NEEDS_DETAILS_LABEL, note);
    await expect(this.answerNowLink).toHaveAttribute("href", ANSWER_PATH);
  }

  async answerNow(): Promise<void> {
    await this.answerNowLink.click();
  }

  async expectOnlyStartNowAction(): Promise<void> {
    await expect(this.onboardingStatus.getByRole("button")).toHaveText([
      "Let Eli start now",
    ]);
    await expect(this.onboardingStatus.getByRole("link")).toHaveCount(0);
  }

  async expectStartNowOffer(): Promise<void> {
    await expect(this.startSoonerNote).toBeVisible();
    await expect(this.startNowButton).toBeEnabled();
  }

  async expectNoStartNowOffer(): Promise<void> {
    await expect(this.startSoonerNote).toHaveCount(0);
    await expect(this.startNowButton).toHaveCount(0);
  }

  async openStartNow(): Promise<ConfirmationDialog> {
    const dialog = new ConfirmationDialog(this.page, START_NOW_LABELS);

    await expect(async () => {
      await this.startNowButton.click();
      await dialog.expectShownWithin(HYDRATION_RETRY_TIMEOUT_MS);
    }).toPass();

    return dialog;
  }

  async openStartNowWithKeyboard(): Promise<ConfirmationDialog> {
    const dialog = new ConfirmationDialog(this.page, START_NOW_LABELS);

    await expect(async () => {
      await this.page.getByRole("heading", { level: 1 }).click();
      await tabTo(this.page, this.startNowButton);
      await this.page.keyboard.press("Enter");
      await dialog.expectShownWithin(HYDRATION_RETRY_TIMEOUT_MS);
    }).toPass();

    return dialog;
  }

  async expectStartNowFocused(): Promise<void> {
    await expect(this.startNowButton).toBeFocused();
  }

  async expectNoPaymentConcern(): Promise<void> {
    await expect(this.onboardingStatus).toBeVisible();
    await expect(this.page.getByText(PAYMENT_PROBLEM_PATTERN)).toHaveCount(0);
    await expect(
      this.page.getByRole("button", { name: PAYMENT_ACTION_PATTERN }),
    ).toHaveCount(0);
  }

  async expectRefusedPhotoToast(view: ProgressPhotoView): Promise<void> {
    await expect(
      this.page.getByText(refusedPhotoToastOf(view), { exact: true }),
    ).toHaveCount(1);
  }

  async expectNoRefusedPhotoToast(): Promise<void> {
    await expect(this.page.getByText(REFUSED_PHOTO_TOAST)).toHaveCount(0);
  }
}

function refusedPhotoViewsCarried(): unknown[] {
  const carried = (window.history.state as CarriedDashboardState)?.usr;

  return carried?.refusedPhotoViews ?? [];
}
