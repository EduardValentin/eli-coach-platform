import { expect, type Page } from "@playwright/test";

const ONBOARDING_REGION_LABEL = "Your onboarding";
const PROGRAM_REGION_LABEL = "Your program";
const NEEDS_DETAILS_LABEL = "Your coach needs a few more details";
const ANSWER_PATH = "/client/onboarding?answer=1";

export class ClientDashboard {
  constructor(private readonly page: Page) {}

  private get onboardingStatus() {
    return this.page.getByRole("region", { name: ONBOARDING_REGION_LABEL });
  }

  private get programStatus() {
    return this.page.getByRole("region", { name: PROGRAM_REGION_LABEL });
  }

  private get answerNowLink() {
    return this.onboardingStatus.getByRole("link", { name: "Answer now" });
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
