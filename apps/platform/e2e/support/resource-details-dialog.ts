import { expect, type Page } from "@playwright/test";

import type { ResourceDetails } from "./resource-requests";

const DIALOG_NAME = "Edit details";

export class ResourceDetailsDialog {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page.getByRole("dialog", { name: DIALOG_NAME, exact: true });
  }

  async fill(details: ResourceDetails): Promise<void> {
    await this.dialog
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(details.title);
    await this.dialog
      .getByRole("textbox", { name: /^Description/ })
      .fill(details.description);
  }

  async save(): Promise<void> {
    await this.dialog
      .getByRole("button", { name: "Save", exact: true })
      .click();
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).toBeHidden();
  }
}
