import { expect, type Page } from "@playwright/test";

const ENDED_PATH = "/client/ended";
const ENDED_TITLE = "Your coaching has ended";
const ENDED_LINE = "It was good to train together.";
const REFUND_LINE =
  "Eli will refund you in the next few days; it reaches your card within 5–10 business days.";

export class ClientEndedPage {
  constructor(private readonly page: Page) {}

  private get landmark() {
    return this.page.getByRole("main", { name: ENDED_TITLE });
  }

  private get refundLine() {
    return this.landmark.getByText(REFUND_LINE, { exact: true });
  }

  async visit(): Promise<void> {
    await this.page.goto(ENDED_PATH);
  }

  async visitWithTrailingSlash(): Promise<void> {
    await this.page.goto(`${ENDED_PATH}/`);
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${ENDED_PATH}$`));
    await expect(
      this.landmark.getByRole("heading", { level: 1, name: ENDED_TITLE }),
    ).toBeVisible();
    await expect(
      this.landmark.getByText(ENDED_LINE, { exact: true }),
    ).toBeVisible();
  }

  async expectRefundLine(): Promise<void> {
    await expect(this.refundLine).toBeVisible();
  }

  async expectNoRefundLine(): Promise<void> {
    await expect(this.refundLine).toHaveCount(0);
  }

  async expectNoActions(): Promise<void> {
    await expect(this.landmark.getByRole("button")).toHaveCount(0);
    await expect(this.landmark.getByRole("link")).toHaveCount(0);
  }
}
