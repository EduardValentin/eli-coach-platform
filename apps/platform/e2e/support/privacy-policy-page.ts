import { expect, type Page } from "@playwright/test";

const PRIVACY_PATH = "/privacy";

export class PrivacyPolicyPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(PRIVACY_PATH);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async expectVersion(version: string, effective: string): Promise<void> {
    await expect(
      this.page.getByText(
        `It is Privacy Policy version ${version}, effective ${effective}.`,
      ),
    ).toBeVisible();
  }

  async expectSentenceCount(sentence: string, count: number): Promise<void> {
    await expect(this.page.getByText(sentence)).toHaveCount(count);
  }
}
