import { expect, type Page } from "@playwright/test";

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

  private get answerNowLink() {
    return this.onboardingStatus.getByRole("link", { name: "Answer now" });
  }

  async open(): Promise<void> {
    await this.page.goto(DASHBOARD_PATH);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
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

  async expectNoOnboardingActions(): Promise<void> {
    await expect(this.onboardingStatus.getByRole("button")).toHaveCount(0);
    await expect(this.onboardingStatus.getByRole("link")).toHaveCount(0);
  }
}
