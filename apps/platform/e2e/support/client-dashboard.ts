import { expect, type Page } from "@playwright/test";

const ONBOARDING_REGION_LABEL = "Your onboarding";

export class ClientDashboard {
  constructor(private readonly page: Page) {}

  private get onboardingStatus() {
    return this.page.getByRole("region", { name: ONBOARDING_REGION_LABEL });
  }

  async expectStatusCard(label: string, line: string): Promise<void> {
    await expect(
      this.onboardingStatus.getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(this.onboardingStatus.getByText(line)).toBeVisible();
  }

  async expectNoOnboardingActions(): Promise<void> {
    await expect(this.onboardingStatus.getByRole("button")).toHaveCount(0);
    await expect(this.onboardingStatus.getByRole("link")).toHaveCount(0);
  }
}
