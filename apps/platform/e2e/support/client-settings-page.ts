import { expect, type Page } from "@playwright/test";

import { ConfirmationDialog } from "./confirmation-dialog";
import { tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type CancellationAction =
  "Cancel and get a full refund" | "Cancel subscription";

const SETTINGS_PATH = "/client/settings";
const KEEP_COACHING_LABEL = "Keep my coaching";
const PAYMENT_PROBLEM_LINE =
  "Your last payment didn't go through. Update your card to keep your coaching going.";

export class ClientSettingsPage {
  constructor(private readonly page: Page) {}

  private get heading() {
    return this.page.getByRole("heading", { level: 1, name: "Settings" });
  }

  private get subscription() {
    return this.page.getByRole("region", { name: "Subscription", exact: true });
  }

  private get subscriptionHeading() {
    return this.subscription.getByRole("heading", {
      level: 2,
      name: "Subscription",
    });
  }

  private get cancelButton() {
    return this.subscription.getByRole("button", {
      name: "Cancel",
      exact: true,
    });
  }

  private get manageButton() {
    return this.subscription.getByRole("button", {
      name: "Manage",
      exact: true,
    });
  }

  private get paymentProblem() {
    return this.subscription
      .getByRole("status")
      .filter({ hasText: PAYMENT_PROBLEM_LINE });
  }

  private cancellationDialog(action: CancellationAction): ConfirmationDialog {
    return new ConfirmationDialog(this.page, {
      title: action,
      confirm: action,
      dismiss: KEEP_COACHING_LABEL,
    });
  }

  async open(): Promise<void> {
    await this.page.goto(SETTINGS_PATH);
    await this.expectOpen();
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${SETTINGS_PATH}$`));
    await expect(this.heading).toBeVisible();
  }

  async expectPlan(title: string, line: string): Promise<void> {
    await expect(
      this.subscription.getByText(title, { exact: true }),
    ).toBeVisible();
    await expect(
      this.subscription.getByText(line, { exact: true }),
    ).toBeVisible();
  }

  async expectCancellationFacts(facts: string): Promise<void> {
    await expect(
      this.subscription.getByText(facts, { exact: true }),
    ).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
  }

  async expectNoCancellation(): Promise<void> {
    await expect(this.cancelButton).toHaveCount(0);
  }

  async cancel(action: CancellationAction): Promise<ConfirmationDialog> {
    const dialog = this.cancellationDialog(action);

    await expect(async () => {
      await this.cancelButton.click();
      await dialog.expectShownWithin(HYDRATION_RETRY_TIMEOUT_MS);
    }).toPass();

    return dialog;
  }

  async cancelWithKeyboard(
    action: CancellationAction,
  ): Promise<ConfirmationDialog> {
    const dialog = this.cancellationDialog(action);

    await expect(async () => {
      await this.heading.click();
      await tabTo(this.page, this.cancelButton);
      await this.page.keyboard.press("Enter");
      await dialog.expectShownWithin(HYDRATION_RETRY_TIMEOUT_MS);
    }).toPass();

    return dialog;
  }

  async expectCancelFocused(): Promise<void> {
    await expect(this.cancelButton).toBeFocused();
  }

  async expectSubscriptionHeadingFocused(): Promise<void> {
    await expect(this.subscriptionHeading).toBeFocused();
  }

  async expectCancelledToast(accessEndDay: string): Promise<void> {
    await expect(
      this.page.getByText(
        `Subscription cancelled. Your access stays until ${accessEndDay}.`,
        { exact: true },
      ),
    ).toBeVisible();
  }

  async expectPaymentProblem(): Promise<void> {
    await expect(this.paymentProblem).toBeVisible();
    await expect(this.manageButton).toBeEnabled();
  }

  async expectNoPaymentProblem(): Promise<void> {
    await expect(this.paymentProblem).toHaveCount(0);
  }

  async expectNoPaymentMethod(): Promise<void> {
    await expect(this.manageButton).toHaveCount(0);
  }

  async manage(): Promise<void> {
    await this.manageButton.click();
  }
}
