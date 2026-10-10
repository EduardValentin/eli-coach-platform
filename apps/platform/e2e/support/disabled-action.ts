import { expect, type Locator, type Page } from "@playwright/test";

import { isFocused, tabTo } from "./keyboard";
import { HYDRATION_RETRY_TIMEOUT_MS } from "./locator-text";

export type DisabledActionParts = {
  button: Locator;
  opens: Locator;
  reason: string;
};

export class DisabledAction {
  constructor(
    private readonly page: Page,
    private readonly parts: DisabledActionParts,
  ) {}

  private get shownReason() {
    return this.page.getByText(this.parts.reason, { exact: true });
  }

  private async expectReasonDescribesButton(): Promise<void> {
    await expect(this.parts.button).toHaveAccessibleDescription(
      this.parts.reason,
    );
  }

  async expectBlocked(): Promise<void> {
    await expect(this.parts.button).toHaveAttribute("aria-disabled", "true");
    await expect(this.parts.button).toBeDisabled();
  }

  async expectAllowed(): Promise<void> {
    await expect(this.parts.button).toBeEnabled();
    await expect(this.parts.button).not.toHaveAttribute("aria-disabled");
    await expect(this.shownReason).toBeHidden();
  }

  async expectReasonOnHover(): Promise<void> {
    await expect(async () => {
      await this.parts.button.hover();
      await expect(this.shownReason).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.expectReasonDescribesButton();
    await this.parts.button.click({ force: true });
    await expect(this.parts.opens).toBeHidden();
    await this.page.mouse.move(0, 0);
    await expect(this.shownReason).toBeHidden();
  }

  async expectReasonOnFocus(): Promise<void> {
    if (await isFocused(this.parts.button)) {
      await this.page.keyboard.press("Shift+Tab");
    }
    await tabTo(this.page, this.parts.button);
    await expect(this.shownReason).toBeVisible();
    await this.expectReasonDescribesButton();
    await this.page.keyboard.press("Enter");
    await expect(this.parts.opens).toBeHidden();
    await this.page.keyboard.press("Escape");
    await expect(this.shownReason).toBeHidden();
    await expect(this.parts.button).toBeFocused();
  }

  async expectReasonOnTap(): Promise<void> {
    await expect(async () => {
      await this.parts.button.tap({ force: true });
      await expect(this.shownReason).toBeVisible({
        timeout: HYDRATION_RETRY_TIMEOUT_MS,
      });
    }).toPass();
    await this.expectReasonDescribesButton();
    await expect(this.parts.opens).toBeHidden();
    await this.parts.button.tap({ force: true });
    await expect(this.shownReason).toBeHidden();
    await expect(this.parts.opens).toBeHidden();
  }
}
